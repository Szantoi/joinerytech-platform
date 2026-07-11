using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a document is unlinked from an entity.
/// </summary>
public record DocumentUnlinkedFromEntityEvent(
    Guid DocumentId,
    Guid TenantId,
    EntityType EntityType,
    Guid EntityId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
