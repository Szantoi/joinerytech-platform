using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a document is restored from deleted status.
/// </summary>
public record DocumentRestoredEvent(
    Guid DocumentId,
    Guid TenantId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
