# Event Sourcing Patterns — SpaceOS Implementation

**Created:** 2026-06-22 (based on EHS Module Sprint 1)

---

## Pattern Overview

**Event Sourcing** = Persist domain state changes as immutable event sequence instead of UPDATE-ing current state.

### Use Cases in SpaceOS

1. **EHS (Environment, Health, Safety) Incident Reporting**
   - Compliance requirement: audit trail of all incident reports
   - Offline-first: events queued locally → synced when online
   - GDPR: anonymization without losing history

2. **Assembly Variance Detection** (ADR-046)
   - Track deviation from expected assembly
   - Approval workflow requires full history

3. **Joinery Order Flow** (future)
   - Order state machine: created → approved → manufactured → delivered
   - Each transition = event

---

## Database Schema Pattern

### Event Store Table

```sql
CREATE TABLE ehs_events (
  event_id UUID PRIMARY KEY,          -- Client-generated for idempotency
  sequence BIGSERIAL,                 -- Server-assigned monotonic sequence
  type VARCHAR(50) NOT NULL,          -- 'incident_reported', 'incident_resolved', etc.
  payload JSONB NOT NULL,             -- Event-specific data
  meta JSONB,                         -- Client metadata (app version, IP, etc.)
  created_at TIMESTAMPTZ NOT NULL,    -- Server timestamp
  tenant_id UUID NOT NULL             -- RLS partition key
);

CREATE INDEX idx_ehs_events_sequence ON ehs_events(sequence);
CREATE INDEX idx_ehs_events_created_at ON ehs_events(created_at DESC);
CREATE INDEX idx_ehs_events_tenant_id ON ehs_events(tenant_id);
```

**Key Design Decisions:**
- `event_id` = **Client-generated UUID** for idempotency (duplicate POST = 200 OK, not 409)
- `sequence` = **Server-assigned** monotonic counter (used for event replay ordering)
- `payload JSONB` = Flexible schema per event type
- `created_at` = **Server timestamp** (authoritative, not client's)

### Materialized View (Projection)

```sql
CREATE MATERIALIZED VIEW ehs_incident_snapshots AS
SELECT
  event_id,
  payload->>'incidentType' AS incident_type,
  payload->>'reporterId' AS reporter_id,
  payload->>'location' AS location,
  payload->>'description' AS description,
  payload->'photos' AS photos,
  created_at,
  tenant_id
FROM ehs_events
WHERE type = 'incident_reported';

CREATE UNIQUE INDEX ON ehs_incident_snapshots(event_id);
```

**Purpose:**
- Fast queries without full event replay
- Refresh strategy: `REFRESH MATERIALIZED VIEW CONCURRENTLY` (no downtime)
- Alternative: Read-model table updated by event handler

---

## Application Layer Pattern

### Domain Aggregate (Immutable Events)

```csharp
// Domain/Aggregates/EhsEvent.cs
public sealed class EhsEvent
{
    public EventId Id { get; private set; }
    public long Sequence { get; private set; }  // Set by repository
    public string Type { get; private set; }
    public IncidentPayload Payload { get; private set; }
    public EventMeta? Meta { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public Guid TenantId { get; private set; }

    // Factory method (event creation)
    public static EhsEvent ReportIncident(
        EventId eventId,
        IncidentPayload payload,
        EventMeta meta,
        Guid tenantId)
    {
        return new EhsEvent
        {
            Id = eventId,
            Type = "incident_reported",
            Payload = payload,
            Meta = meta,
            CreatedAt = DateTime.UtcNow,  // Server timestamp
            TenantId = tenantId
        };
    }

    // No setters → immutable after creation
}
```

### Command Handler

```csharp
// Application/Commands/ReportIncidentCommandHandler.cs
public sealed class ReportIncidentCommandHandler
{
    private readonly IEhsEventRepository _repository;
    private readonly ICurrentUserContext _userContext;

    public async Task<EventId> Handle(ReportIncidentCommand command)
    {
        // 1. Idempotency check (duplicate UUID = already processed)
        var existingEvent = await _repository.GetByEventIdAsync(command.EventId);
        if (existingEvent != null)
        {
            return existingEvent.Id;  // 200 OK, not 201 Created
        }

        // 2. Validate reporter exists (integration with Identity module)
        // TODO: await _identityService.ValidateUserExistsAsync(command.ReporterId);

        // 3. Timestamp drift validation (max 2 hours)
        var serverTime = DateTime.UtcNow;
        var clientTime = command.Payload.Timestamp;
        if (Math.Abs((serverTime - clientTime).TotalHours) > 2)
        {
            throw new ValidationException("Timestamp drift exceeded 2 hours");
        }

        // 4. Create event
        var ehsEvent = EhsEvent.ReportIncident(
            eventId: command.EventId,
            payload: command.Payload,
            meta: new EventMeta
            {
                AppVersion = command.AppVersion,
                IpAddress = _userContext.IpAddress
            },
            tenantId: _userContext.TenantId
        );

        // 5. Persist to event store
        await _repository.AddAsync(ehsEvent);

        return ehsEvent.Id;
    }
}
```

---

## API Pattern

### Idempotent POST Endpoint

```csharp
// Api/Controllers/EventsController.cs
[HttpPost("/api/ehs/events")]
public async Task<IActionResult> ReportIncident([FromBody] ReportIncidentRequest request)
{
    var command = new ReportIncidentCommand
    {
        EventId = request.EventId,  // Client-generated UUID
        Payload = request.Payload,
        AppVersion = Request.Headers["X-App-Version"]
    };

    var eventId = await _mediator.Send(command);

    // Check if this was idempotent (existing event)
    var existingEvent = await _repository.GetByEventIdAsync(eventId);
    if (existingEvent.CreatedAt < DateTime.UtcNow.AddSeconds(-1))
    {
        return Ok(new { eventId, status = "duplicate" });  // 200 OK
    }

    return StatusCode(201, new { eventId, status = "created" });  // 201 Created
}
```

**Idempotency Key:** Client generates UUID before POST → Retry-safe

---

## Offline-First Pattern

### Client-Side Event Queue (Frontend)

```typescript
// IndexedDB queue for offline events
const offlineEventQueue = await db.events.where('synced').equals(false).toArray()

// Sync worker (background)
async function syncEvents() {
  for (const event of offlineEventQueue) {
    try {
      await fetch('/api/ehs/events', {
        method: 'POST',
        body: JSON.stringify({
          eventId: event.id,  // Pre-generated UUID
          payload: event.payload
        })
      })

      // Mark as synced
      await db.events.update(event.id, { synced: true })
    } catch (err) {
      // Retry later (exponential backoff)
    }
  }
}
```

**Compliance Deadline:** 72 hours sync required (ADR-046 Q4)

---

## Validation Rules

| Rule | Implementation | Rationale |
|------|----------------|-----------|
| **Idempotency** | UUID check before insert | Offline retry-safe |
| **Timestamp drift** | `abs(server - client) < 2h` | Prevent backdating |
| **Photo size** | Max 5MB | S3 presigned URL |
| **Reporter exists** | Identity module lookup | GDPR compliance |

---

## GDPR Compliance Pattern

### Right to Forget (Anonymization)

```sql
-- Anonymize events without deleting history
UPDATE ehs_events
SET payload = jsonb_set(
  payload,
  '{reporterId}',
  '"[ANONYMIZED]"'::jsonb
)
WHERE payload->>'reporterId' = '<user-to-forget>';

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY ehs_incident_snapshots;
```

**Alternative:** Hard delete events + compensating event:
```json
{
  "type": "user_forgotten",
  "payload": {
    "userId": "uuid",
    "deletedEventIds": ["event1", "event2"]
  }
}
```

---

## Testing Strategy

### Unit Tests

```csharp
[Fact]
public async Task ReportIncident_DuplicateEventId_ReturnsExistingEvent()
{
    // Arrange
    var eventId = EventId.New();
    var existingEvent = EhsEvent.ReportIncident(eventId, payload, meta, tenantId);
    await _repository.AddAsync(existingEvent);

    // Act
    var result = await _handler.Handle(new ReportIncidentCommand { EventId = eventId });

    // Assert
    Assert.Equal(eventId, result);  // Idempotency
}

[Fact]
public async Task ReportIncident_TimestampDrift_ThrowsValidationException()
{
    // Arrange
    var command = new ReportIncidentCommand
    {
        Payload = new IncidentPayload
        {
            Timestamp = DateTime.UtcNow.AddHours(-3)  // 3 hours drift
        }
    };

    // Act & Assert
    await Assert.ThrowsAsync<ValidationException>(() => _handler.Handle(command));
}
```

### Integration Tests

```csharp
[Fact]
public async Task POST_EhsEvents_ReturnsCreated()
{
    // Arrange
    var request = new { eventId = Guid.NewGuid(), payload = new IncidentPayload { ... } };

    // Act
    var response = await _client.PostAsJsonAsync("/api/ehs/events", request);

    // Assert
    Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    var content = await response.Content.ReadAsJsonAsync<EventResponse>();
    Assert.NotEqual(0, content.Sequence);  // Server-assigned
}
```

---

## Common Pitfalls

### 1. Using auto-increment PK as event ID
**Problem:** Client can't generate ID → no idempotency
**Fix:** Client generates UUID, server assigns sequence separately

### 2. Trusting client timestamp
**Problem:** Backdating, clock skew
**Fix:** Server timestamp is authoritative (`created_at`)

### 3. Updating events after insert
**Problem:** Breaks immutability guarantee
**Fix:** New event type for corrections (e.g., `incident_amended`)

### 4. No RLS on event table
**Problem:** Tenant isolation breach
**Fix:** Add RLS policy on `tenant_id`

---

## Performance Considerations

- **Event table growth:** Archive cold events to blob storage after 2+ years
- **Materialized view refresh:** `CONCURRENTLY` to avoid locking
- **Query optimization:** Index on `(tenant_id, created_at DESC)` for recent events
- **Batch sync:** POST `/api/ehs/events/batch` for offline bulk sync (ADR-046)

---

## References

- Implementation: `backend/spaceos-modules-ehs/` (38 C# files, Sprint 1)
- DONE message: `terminals/backend/outbox/2026-06-22_024_ehs-incident-reporting-api-done.md`
- ADR-046: Consensus 2026-06-22 — EHS architecture decisions
- Inspiration: Greg Young's "CQRS & Event Sourcing" talks
