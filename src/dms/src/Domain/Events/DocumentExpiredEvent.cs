using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a document has expired.
/// </summary>
public record DocumentExpiredEvent(
    Guid DocumentId,
    Guid TenantId,
    DateOnly ExpiryDate) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
