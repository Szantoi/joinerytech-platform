using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record AbsenceApprovedEvent(
    AbsenceId AbsenceId,
    Guid TenantId,
    EmployeeId EmployeeId,
    Guid ApprovedByUserId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
