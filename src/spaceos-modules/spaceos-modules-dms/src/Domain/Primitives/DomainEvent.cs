namespace SpaceOS.Modules.DMS.Domain.Primitives;

/// <summary>
/// Base class for domain events.
/// </summary>
public abstract record DomainEvent : IDomainEvent
{
    /// <summary>
    /// When this event occurred (UTC).
    /// </summary>
    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
}
