using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: PPE replaced — a new issuance was generated
/// (FSM: Acknowledged → Replaced, new issuance starts at Issued)
/// </summary>
public record PpeReplacedEvent(
    Guid ReplacedIssuanceId,
    Guid NewIssuanceId,
    Guid EmployeeId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
