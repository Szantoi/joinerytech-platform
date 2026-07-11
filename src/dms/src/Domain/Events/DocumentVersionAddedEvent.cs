using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a new version is added to a document.
/// </summary>
public record DocumentVersionAddedEvent(
    Guid DocumentId,
    Guid TenantId,
    Guid VersionId,
    int VersionNumber) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
