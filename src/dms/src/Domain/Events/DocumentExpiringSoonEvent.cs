using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Domain event raised when a document is expiring soon (within threshold).
/// </summary>
public record DocumentExpiringSoonEvent(
    Guid DocumentId,
    Guid TenantId,
    DateOnly ExpiryDate,
    int DaysUntilExpiry) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
