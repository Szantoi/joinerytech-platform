using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a tag is removed from a document.
/// </summary>
public record DocumentTagRemovedEvent(
    Guid DocumentId,
    Guid TenantId,
    string Tag) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
