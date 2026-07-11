namespace SpaceOS.Modules.DMS.Domain.Primitives;

/// <summary>
/// Base class for aggregate roots with domain events support.
/// </summary>
/// <typeparam name="TId">Strongly-typed identifier for this aggregate</typeparam>
public abstract class AggregateRoot<TId>
{
    private readonly List<IDomainEvent> _domainEvents = new();

    /// <summary>
    /// Read-only collection of domain events raised by this aggregate.
    /// </summary>
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    /// <summary>
    /// Timestamp when this aggregate was created (UTC).
    /// </summary>
    public DateTime CreatedAt { get; protected set; }

    /// <summary>
    /// Timestamp when this aggregate was last updated (UTC).
    /// </summary>
    public DateTime? UpdatedAt { get; protected set; }

    /// <summary>
    /// Raises a domain event to be published after the aggregate is persisted.
    /// </summary>
    protected void AddDomainEvent(IDomainEvent domainEvent)
    {
        _domainEvents.Add(domainEvent);
    }

    /// <summary>
    /// Retrieves and clears all domain events. Called after persistence to publish events.
    /// </summary>
    public IReadOnlyList<IDomainEvent> PopDomainEvents()
    {
        var events = _domainEvents.ToList();
        _domainEvents.Clear();
        return events;
    }
}
