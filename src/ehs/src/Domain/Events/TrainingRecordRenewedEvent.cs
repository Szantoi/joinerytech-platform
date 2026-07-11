using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: Training record renewed
/// </summary>
public record TrainingRecordRenewedEvent(
    Guid TrainingRecordId,
    DateTimeOffset NewExpiryDate
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
