using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when document metadata is updated.
/// </summary>
public record DocumentMetadataUpdatedEvent(
    Guid DocumentId,
    Guid TenantId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
