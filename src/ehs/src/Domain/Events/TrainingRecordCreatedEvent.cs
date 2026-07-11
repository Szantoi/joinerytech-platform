using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: Training record created
/// </summary>
public record TrainingRecordCreatedEvent(
    Guid TrainingRecordId,
    Guid EmployeeId,
    string TrainingType
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
