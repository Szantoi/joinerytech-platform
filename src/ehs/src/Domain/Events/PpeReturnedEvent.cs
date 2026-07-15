using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: PPE returned to stock (FSM: Acknowledged → Returned)
/// </summary>
public record PpeReturnedEvent(
    Guid IssuanceId,
    Guid EmployeeId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
