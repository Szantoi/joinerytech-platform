using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record AbsenceRejectedEvent(
    AbsenceId AbsenceId,
    Guid TenantId,
    EmployeeId EmployeeId,
    Guid RejectedByUserId,
    string RejectionReason) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
