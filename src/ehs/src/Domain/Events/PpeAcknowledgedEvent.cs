using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: employee acknowledged PPE receipt (FSM: Issued → Acknowledged)
/// </summary>
public record PpeAcknowledgedEvent(
    Guid IssuanceId,
    Guid EmployeeId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
