using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: Training record expired (optional - for notifications)
/// </summary>
public record TrainingRecordExpiredEvent(
    Guid TrainingRecordId,
    Guid EmployeeId,
    string TrainingType
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
