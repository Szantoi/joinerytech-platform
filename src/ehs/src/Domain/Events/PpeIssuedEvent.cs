using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: PPE issued to an employee (FSM: → Issued)
/// </summary>
public record PpeIssuedEvent(
    Guid IssuanceId,
    Guid EmployeeId,
    Guid PpeItemId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
