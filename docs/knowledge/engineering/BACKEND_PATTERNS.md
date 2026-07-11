# Backend Patterns — SpaceOS .NET 8 + PostgreSQL

> **Adapted from:** general backend_dotnet patterns for SpaceOS specifics (.NET 8, PostgreSQL 16, EF Core 8)

---

## Clean Architecture Layers

```
Domain Layer        (Zero external NuGet deps except Ardalis.Result)
  ├── Aggregates    (Root Entity + Owned Entities)
  ├── Value Objects (Immutable record structs)
  ├── Domain Events (readonly record struct)
  └── Repository Interfaces

Application Layer   (MediatR handlers, Validators, DTOs)
  ├── Commands/Queries
  ├── Handlers (CQRS pattern)
  ├── Validators (FluentValidation)
  └── DTOs (Data Transfer Objects)

Infrastructure Layer (EF Core, PostgreSQL, Service Implementations)
  ├── DbContext (AppDbContext)
  ├── Repository Implementations
  ├── Service Implementations
  └── Configurations (EF mappings)

API Layer           (Minimal API endpoints)
  └── Endpoints (Parameter extraction, result mapping)
```

**Dependency Rule:** `Domain ← Application ← Infrastructure ← Api`

---

## Aggregate Rules (DDD)

### Entity Factory Pattern
```csharp
// ✅ CORRECT: Factory method, no public constructor
public class Tenant
{
    private Tenant(TenantId id, TenantName name) { /* ... */ }

    public static Tenant Create(TenantName name)
    {
        var tenant = new Tenant(TenantId.New(), name);
        tenant.AddDomainEvent(new TenantCreatedEvent(tenant.Id));
        return tenant;
    }
}

// ❌ NEVER: Public setter or constructor exposed
public class Tenant
{
    public Tenant() { }  // ❌ Public constructor
    public string Name { get; set; }  // ❌ Public setter
}
```

### Mutation through Domain Methods
```csharp
// ✅ CORRECT: Business logic in aggregate
public void Rename(TenantName newName)
{
    Name = newName;
    AddDomainEvent(new TenantRenamedEvent(Id, newName));
}

// ❌ NEVER: Public setter or logic in handler
// Handler: if (command.Name.Length > 100) return Error(...);
// Instead: logic goes in TenantName Value Object
```

---

## FSM Aggregate Pattern (State Machine)

> **Pattern:** Aggregate Root with explicit Finite State Machine (FSM) for lifecycle management
> **Use case:** Lead, Opportunity, HR attendance, QA inspection, Maintenance work orders
> **Benefits:** Type-safe state transitions, PostgreSQL RLS per state, audit trail

### FSM Aggregate Structure

```csharp
// ✅ CORRECT: Aggregate with FSM state + transition methods
public class Lead
{
    private Lead(LeadId id, ContactInfo contact, LeadState initialState)
    {
        Id = id;
        Contact = contact;
        State = initialState;
    }

    public LeadId Id { get; }
    public ContactInfo Contact { get; private set; }
    public LeadState State { get; private set; }  // FSM state
    public DateTime StateChangedAt { get; private set; }

    // Factory: Always starts in "New" state
    public static Lead Create(ContactInfo contact)
    {
        var lead = new Lead(LeadId.New(), contact, LeadState.New);
        lead.AddDomainEvent(new LeadCreatedEvent(lead.Id, lead.Contact));
        return lead;
    }

    // State transition methods enforce FSM rules
    public Result MarkContacted(DateTime contactedAt)
    {
        if (State != LeadState.New)
            return Result.Error("Can only mark contacted from New state");

        State = LeadState.Contacted;
        StateChangedAt = contactedAt;
        AddDomainEvent(new LeadContactedEvent(Id, contactedAt));
        return Result.Success();
    }

    public Result Qualify(string qualificationNotes)
    {
        if (State != LeadState.Contacted)
            return Result.Error("Can only qualify from Contacted state");

        State = LeadState.Qualified;
        StateChangedAt = DateTime.UtcNow;
        AddDomainEvent(new LeadQualifiedEvent(Id, qualificationNotes));
        return Result.Success();
    }

    public Result Convert(OpportunityId opportunityId)
    {
        if (State != LeadState.Qualified)
            return Result.Error("Can only convert from Qualified state");

        State = LeadState.Converted;
        StateChangedAt = DateTime.UtcNow;
        AddDomainEvent(new LeadConvertedEvent(Id, opportunityId));
        return Result.Success();
    }
}

// FSM State enum
public enum LeadState
{
    New = 1,
    Contacted = 2,
    Qualified = 3,
    Converted = 4
}
```

### PostgreSQL RLS per FSM State

```sql
-- Lead table with RLS based on state
CREATE TABLE crm.leads (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    contact_name VARCHAR(200) NOT NULL,
    state INT NOT NULL,  -- FSM state (1=New, 2=Contacted, etc.)
    state_changed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policy: Sales users can see New/Contacted, Managers can see all
CREATE POLICY leads_sales_access ON crm.leads
    FOR SELECT
    USING (
        tenant_id::TEXT = current_setting('app.tenant_id', true)
        AND (
            state IN (1, 2)  -- New, Contacted
            OR current_setting('app.user_role', true) = 'Manager'
        )
    );

-- Index on state for fast filtering
CREATE INDEX idx_leads_state ON crm.leads(state);
CREATE INDEX idx_leads_tenant_state ON crm.leads(tenant_id, state);
```

### CQRS Handler Pattern for FSM

**Commands (state transitions):**

```csharp
// ✅ CORRECT: One command per state transition
public record MarkLeadContactedCommand(LeadId LeadId, DateTime ContactedAt) : IRequest<Result>;

public class MarkLeadContactedHandler : IRequestHandler<MarkLeadContactedCommand, Result>
{
    private readonly ILeadRepository _repo;

    public async Task<Result> Handle(MarkLeadContactedCommand request, CancellationToken ct)
    {
        var lead = await _repo.GetByIdAsync(request.LeadId, ct).ConfigureAwait(false);
        if (lead is null)
            return Result.NotFound("Lead not found");

        var result = lead.MarkContacted(request.ContactedAt);  // FSM transition
        if (!result.IsSuccess)
            return result;

        await _repo.UpdateAsync(lead, ct).ConfigureAwait(false);
        return Result.Success();
    }
}
```

**Queries (state-aware):**

```csharp
// ✅ CORRECT: Filter by state using specification
public record GetLeadsByStateQuery(LeadState State) : IRequest<Result<IReadOnlyList<LeadDto>>>;

public sealed class LeadsByStateSpec : Specification<Lead>
{
    public LeadsByStateSpec(LeadState state) =>
        Query.Where(l => l.State == state);
}

public class GetLeadsByStateHandler : IRequestHandler<GetLeadsByStateQuery, Result<IReadOnlyList<LeadDto>>>
{
    private readonly ILeadRepository _repo;

    public async Task<Result<IReadOnlyList<LeadDto>>> Handle(GetLeadsByStateQuery request, CancellationToken ct)
    {
        var spec = new LeadsByStateSpec(request.State);
        var leads = await _repo.ListAsync(spec, ct).ConfigureAwait(false);

        var dtos = leads.Select(l => new LeadDto(
            l.Id.Value,
            l.Contact.Name.Value,
            l.State,
            l.StateChangedAt
        )).ToList();

        return Result<IReadOnlyList<LeadDto>>.Success(dtos);
    }
}
```

### FluentValidation for FSM Commands

```csharp
public class MarkLeadContactedCommandValidator : AbstractValidator<MarkLeadContactedCommand>
{
    public MarkLeadContactedCommandValidator()
    {
        RuleFor(x => x.LeadId)
            .NotEmpty()
            .WithMessage("LeadId is required");

        RuleFor(x => x.ContactedAt)
            .NotEmpty()
            .WithMessage("ContactedAt is required")
            .LessThanOrEqualTo(DateTime.UtcNow)
            .WithMessage("ContactedAt cannot be in the future");
    }
}
```

### FSM Reusability — Domain Templates

**Lead FSM:** `New → Contacted → Qualified → Converted`
- **Use case:** CRM lead tracking
- **RLS:** Sales sees New/Contacted, Managers see all

**Opportunity FSM:** `Draft → Proposal → Negotiation → Won/Lost`
- **Use case:** Sales pipeline
- **RLS:** Assigned sales rep + Manager

**HR Attendance FSM:** `Pending → Approved → Rejected`
- **Use case:** Time-off requests
- **RLS:** Employee sees own, HR sees all

**QA Inspection FSM:** `Scheduled → InProgress → Pass/Fail → Rework`
- **Use case:** Quality control workflow
- **RLS:** QA inspector + Production manager

**Maintenance Work Order FSM:** `Reported → Assigned → InProgress → Completed`
- **Use case:** Equipment maintenance
- **RLS:** Technician sees assigned, Supervisor sees all

### FSM Anti-Patterns

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Enum state with no validation | Any transition allowed | Explicit transition methods |
| State changes in handlers | Business logic leaks out | Move to aggregate |
| Missing RLS on state | Security gap | Add RLS policy per state |
| Public State setter | Breaks FSM invariant | Private setter + methods |
| No state change events | Audit trail incomplete | Emit event on every transition |

---

## Value Object Rules

### Immutable Design
```csharp
// ✅ CORRECT: readonly record struct with invariant validation
public readonly record struct TenantName
{
    public string Value { get; }

    private TenantName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Tenant name cannot be empty");
        if (value.Length > 100)
            throw new DomainException("Tenant name cannot exceed 100 chars");
        Value = value;
    }

    public static TenantName From(string value) => new(value);
}

// ❌ NEVER: Mutable or unvalidated
public record struct TenantName { public string Value { get; set; } }
```

### ID Value Objects
```csharp
public readonly record struct TenantId
{
    public Guid Value { get; }
    private TenantId(Guid value) => Value = value;
    public static TenantId New() => new(Guid.NewGuid());
    public static TenantId From(Guid value) => new(value);
}
```

---

## Domain Event Rules

```csharp
// ✅ CORRECT: Immutable events with marker interface
public readonly record struct TenantCreatedEvent(TenantId TenantId) : IDomainEvent;

// Events raised inside aggregate:
public static Tenant Create(TenantName name)
{
    var tenant = new Tenant(TenantId.New(), name);
    tenant.AddDomainEvent(new TenantCreatedEvent(tenant.Id));
    return tenant;
}

// Handler dispatches after save:
foreach (var @event in tenant.PopDomainEvents())
    await _eventDispatcher.DispatchAsync(@event, ct);
```

---

## Repository & Specification Pattern

### Repository Interface (in Domain)
```csharp
public interface ITenantRepository
{
    Task<Tenant?> GetByIdAsync(TenantId id, CancellationToken ct);
    Task AddAsync(Tenant tenant, CancellationToken ct);
    Task UpdateAsync(Tenant tenant, CancellationToken ct);
    Task<IReadOnlyList<Tenant>> ListAsync(ISpecification<Tenant> spec, CancellationToken ct);
}

// ❌ NEVER: ListAllAsync without spec
Task<IReadOnlyList<Tenant>> ListAllAsync(CancellationToken ct);
```

### Ardalis Specification
```csharp
// ✅ CORRECT: Every list query through a spec
public sealed class AllTenantsSpec : Specification<Tenant> { }

public sealed class FacilitiesByTenantIdSpec : Specification<Facility>
{
    public FacilitiesByTenantIdSpec(TenantId tenantId) =>
        Query.Where(f => f.TenantId == tenantId);
}
```

---

## Database Access Patterns (EF Core 8)

### ConfigureAwait(false) Requirement
```csharp
// ✅ CORRECT: Every async call includes ConfigureAwait(false)
var tenant = await _repository.GetByIdAsync(id, ct).ConfigureAwait(false);

// ❌ NEVER: Missing ConfigureAwait in production code
var tenant = await _repository.GetByIdAsync(id, ct);
```

### AsNoTracking() for Read-Only
```csharp
// ✅ CORRECT: AsNoTracking on read-only queries
_db.Tenants.AsNoTracking().Where(t => t.Id == id).FirstOrDefaultAsync();

// ❌ NEVER: Tracking when you don't need updates
_db.Tenants.Where(t => t.Id == id).FirstOrDefaultAsync();
```

### Row-Level Security (RLS) with GUC
```csharp
// ✅ CORRECT: SET LOCAL in same connection
if (db.Database.IsRelational())
    await db.Database.OpenConnectionAsync(ct).ConfigureAwait(false);
try
{
    await db.Database.ExecuteSqlRawAsync(
        "SELECT set_config('app.tenant_id', {0}, false)",
        tenantId.ToString()
    ).ConfigureAwait(false);

    var results = await _repository.ListAsync(spec, ct).ConfigureAwait(false);
}
finally
{
    if (db.Database.IsRelational())
        await db.Database.CloseConnectionAsync().ConfigureAwait(false);
}
```

---

## Testcontainers for PostgreSQL

### Integration Test Setup
```csharp
[Collection("PostgreSQL")]
public class TenantRepositoryTests
{
    private readonly PostgreSqlContainer _container;
    private readonly AppDbContext _db;

    public TenantRepositoryTests()
    {
        _container = new PostgreSqlBuilder()
            .WithDatabase("spaceos_test")
            .Build();

        await _container.StartAsync();
        var connectionString = _container.GetConnectionString();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .Options;

        _db = new AppDbContext(options);
        await _db.Database.MigrateAsync();
    }

    [Fact]
    public async Task CreateTenant_ShouldPersist()
    {
        var tenant = Tenant.Create(TenantName.From("Test"));
        await _db.Tenants.AddAsync(tenant);
        await _db.SaveChangesAsync();

        var retrieved = await _db.Tenants.FirstOrDefaultAsync(t => t.Id == tenant.Id);
        Assert.NotNull(retrieved);
    }
}
```

---

## Moq for Mocking

### Repository Mocking
```csharp
var mockRepo = new Mock<ITenantRepository>();
mockRepo
    .Setup(r => r.GetByIdAsync(It.IsAny<TenantId>(), It.IsAny<CancellationToken>()))
    .ReturnsAsync(new Tenant(...));

var handler = new GetTenantHandler(mockRepo.Object);
var result = await handler.Handle(new GetTenantQuery(tenantId), CancellationToken.None);

Assert.True(result.IsSuccess);
```

---

## Result<T> Pattern

### Always Return Result<T>
```csharp
// ✅ CORRECT: Explicit success/failure handling
public async Task<Result<TenantDto>> Handle(GetTenantQuery request, CancellationToken ct)
{
    var tenant = await _repo.GetByIdAsync(request.Id, ct).ConfigureAwait(false);
    if (tenant is null)
        return Result<TenantDto>.NotFound("Tenant not found");

    return Result<TenantDto>.Success(
        new TenantDto(tenant.Id.Value, tenant.Name.Value)
    );
}

// ❌ NEVER: Throwing exceptions for business failures
if (tenant is null)
    throw new TenantNotFoundException();
```

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Wrong | Fix |
|---|---|---|
| Public setters on entities | Breaks encapsulation, makes validation impossible | Use private setters + methods |
| Business logic in handlers | Hard to test, violates DDD | Move to aggregate |
| Domain referencing infrastructure | Breaks domain purity | Keep Domain clean |
| Mutable domain events | Can be accidentally modified | Use readonly record structs |
| Public constructors | Hard to enforce invariants | Use static factories |
| ListAllAsync() | Dangerous at scale, no filtering | Always use specifications |
| Missing ConfigureAwait(false) | Can deadlock in sync contexts | Always include in production |
| Tracking in read-only queries | Unnecessary memory, slower | Use AsNoTracking() |

---

## Cross-Module Integration Pattern

### Pattern: Domain Events via Contracts Module

**Implementation:** MSG-BACKEND-451 (Maintenance → Production)

**Problem:** Two modules need to communicate without direct dependencies.

**Solution:** Shared event in `spaceos-modules-contracts/`, published via MediatR.

### Example: AssetDowntimeEvent

**1. Event Definition (Contracts Module)**

```csharp
// spaceos-modules-contracts/SpaceOS.Modules.Contracts/Maintenance/Events/AssetDowntimeEvent.cs
using MediatR;
using SpaceOS.Modules.Contracts.Shared;

namespace SpaceOS.Modules.Contracts.Maintenance.Events;

public sealed record AssetDowntimeEvent : ModuleEvent, INotification
{
    public required Guid AssetId { get; init; }
    public required string AssetName { get; init; }
    public required string Reason { get; init; }
    public required DateTimeOffset? EstimatedFixDate { get; init; }
}
```

**2. Event Handler (Consuming Module)**

```csharp
// Production.Application/EventHandlers/AssetDowntimeEventHandler.cs
public class AssetDowntimeEventHandler : INotificationHandler<AssetDowntimeEvent>
{
    private readonly IProductionJobRepository _repository;

    public async Task Handle(AssetDowntimeEvent notification, CancellationToken ct)
    {
        var affectedJobs = await _repository.FindByAssetIdAsync(notification.AssetId, ct);

        foreach (var job in affectedJobs)
        {
            if (job.Status == ProductionStatus.InProgress)
            {
                job.Pause(reason: $"Asset '{notification.AssetName}' unavailable: {notification.Reason}");
            }
            else if (job.Status == ProductionStatus.Queued && notification.EstimatedFixDate.HasValue)
            {
                job.Reschedule(newDeadline: notification.EstimatedFixDate);
            }

            await _repository.UpdateAsync(job, ct);
        }

        await _repository.SaveChangesAsync(ct);
    }
}
```

**3. Integration Test**

```csharp
// Production.Tests/Integration/CrossModule/Maintenance_AssetDowntime_ImpactsProduction.cs
[Fact]
public async Task AssetDowntime_PausesInProgressJob()
{
    // Arrange
    var assetId = Guid.NewGuid();
    var job = ProductionJob.Create(...);
    job.AssignAsset(assetId);
    job.StartStep(WorkflowStepName.SzabaszatElőgyártás);

    await _repository.AddAsync(job);
    await _repository.SaveChangesAsync();

    var downtimeEvent = new AssetDowntimeEvent { ... };
    var handler = new AssetDowntimeEventHandler(_repository);

    // Act
    await handler.Handle(downtimeEvent, CancellationToken.None);

    // Assert
    var updatedJob = await _repository.GetByIdAsync(job.Id);
    Assert.Contains("unavailable", updatedJob.StatusReason);
}
```

### Best Practices

| Practice | Why | Example |
|---|---|---|
| **Event in Contracts module** | Single source of truth, versioned | `SpaceOS.Modules.Contracts.Maintenance.Events` |
| **Implement INotification** | MediatR integration | `AssetDowntimeEvent : ModuleEvent, INotification` |
| **Handler in consuming module** | Encapsulation, testability | `Production.Application/EventHandlers/` |
| **Aggregate methods** | Business logic stays in Domain | `job.Pause(reason)`, `job.Reschedule(date)` |
| **Integration tests** | Validate cross-module contract | `CrossModule/Maintenance_AssetDowntime_ImpactsProduction.cs` |
| **NO direct DB calls** | Preserve module boundaries | Use events, NOT direct queries to other module's DB |

### Module Dependency Flow

```
Maintenance (Publisher) → Contracts (Event) → Production (Subscriber)
```

**Benefits:**
- ✅ Loose coupling (modules don't reference each other)
- ✅ Testable in isolation (mock events in tests)
- ✅ Event versioning (Contracts module is versioned NuGet)
- ✅ Clear boundaries (explicit event contracts)

**When NOT to use:**
- ❌ Synchronous request-response (use API call instead)
- ❌ Complex orchestration (use Saga pattern)
- ❌ Within same module (use internal domain events)

---

**Implemented in:** Production module (MSG-BACKEND-451, 2026-07-10)
**Related Checkpoints:** CP-MAINT-PROD-INTEGRATION
