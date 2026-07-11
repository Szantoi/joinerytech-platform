// Ehs.Domain/Aggregates/EhsEvent.cs

using Ehs.Domain.ValueObjects;

namespace Ehs.Domain.Aggregates;

/// <summary>
/// Aggregate root representing an immutable EHS event in the event store.
/// Event sourcing pattern: append-only, no updates.
/// </summary>
public sealed class EhsEvent
{
    /// <summary>Client-generated UUID for idempotency.</summary>
    public EventId EventId { get; private set; }

    /// <summary>Auto-incrementing sequence number (server-side).</summary>
    public long Sequence { get; private set; }

    /// <summary>Event type (e.g., "INCIDENT_REPORTED").</summary>
    public string Type { get; private set; }

    /// <summary>Event payload as JSON (flexible schema).</summary>
    public string PayloadJson { get; private set; }

    /// <summary>Event metadata as JSON (deviceId, clientTimestamp, etc.).</summary>
    public string? MetaJson { get; private set; }

    /// <summary>Tenant ID (multi-tenancy isolation).</summary>
    public Guid TenantId { get; private set; }

    /// <summary>Server timestamp when event was persisted.</summary>
    public DateTimeOffset CreatedAt { get; private set; }

    // Required by EF Core for materialization
#pragma warning disable CS8618
    private EhsEvent() { }
#pragma warning restore CS8618

    private EhsEvent(
        EventId eventId,
        string type,
        string payloadJson,
        string? metaJson,
        Guid tenantId,
        DateTimeOffset createdAt)
    {
        EventId = eventId;
        Sequence = 0; // Set by database SERIAL
        Type = type;
        PayloadJson = payloadJson;
        MetaJson = metaJson;
        TenantId = tenantId;
        CreatedAt = createdAt;
    }

    /// <summary>
    /// Factory method to create a new EHS event.
    /// </summary>
    /// <param name="eventId">Client-generated event ID (for idempotency).</param>
    /// <param name="type">Event type (e.g., "INCIDENT_REPORTED").</param>
    /// <param name="payloadJson">Event payload as JSON string.</param>
    /// <param name="metaJson">Optional metadata as JSON string.</param>
    /// <param name="tenantId">Tenant ID.</param>
    /// <param name="now">Optional timestamp (for testability).</param>
    public static EhsEvent Create(
        EventId eventId,
        string type,
        string payloadJson,
        string? metaJson,
        Guid tenantId,
        DateTimeOffset? now = null)
    {
        if (string.IsNullOrWhiteSpace(type))
            throw new ArgumentException("Event type cannot be empty.", nameof(type));

        if (string.IsNullOrWhiteSpace(payloadJson))
            throw new ArgumentException("Payload cannot be empty.", nameof(payloadJson));

        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId cannot be empty.", nameof(tenantId));

        var timestamp = now ?? DateTimeOffset.UtcNow;

        return new EhsEvent(eventId, type, payloadJson, metaJson, tenantId, timestamp);
    }
}
