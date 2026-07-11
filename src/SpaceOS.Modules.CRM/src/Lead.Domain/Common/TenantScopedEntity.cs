namespace SpaceOS.Modules.CRM.Domain.Common;

/// <summary>
/// Base class for tenant-scoped entities that require multi-tenant isolation.
/// </summary>
public abstract class TenantScopedEntity
{
    /// <summary>Unique identifier for this entity.</summary>
    public Guid Id { get; protected set; } = Guid.NewGuid();

    /// <summary>Tenant ID for multi-tenant isolation.</summary>
    public Guid TenantId { get; protected set; }

    /// <summary>Domain events raised during this entity's lifecycle.</summary>
    protected List<DomainEvent> _domainEvents { get; } = new();

    /// <summary>Get all domain events raised by this aggregate.</summary>
    public IReadOnlyList<DomainEvent> GetDomainEvents() => _domainEvents.AsReadOnly();

    /// <summary>Clear domain events after they've been persisted.</summary>
    public void ClearDomainEvents() => _domainEvents.Clear();

    /// <summary>Raise a domain event (add to collection).</summary>
    protected void RaiseDomainEvent(DomainEvent @event)
    {
        @event.AggregateId ??= Id;
        @event.TenantId ??= TenantId;
        @event.OccurredAt ??= DateTimeOffset.UtcNow;
        _domainEvents.Add(@event);
    }
}

/// <summary>
/// Base class for all domain events.
/// </summary>
public abstract class DomainEvent
{
    public Guid? AggregateId { get; set; }
    public Guid? TenantId { get; set; }
    public DateTimeOffset? OccurredAt { get; set; }
    public string? CorrelationId { get; set; }
    public string? CausationId { get; set; }
}
