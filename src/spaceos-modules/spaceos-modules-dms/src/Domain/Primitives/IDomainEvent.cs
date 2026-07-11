namespace SpaceOS.Modules.DMS.Domain.Primitives;

/// <summary>
/// Marker interface for domain events.
/// </summary>
public interface IDomainEvent
{
    DateTime OccurredAt => DateTime.UtcNow;
}
