using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record AbsenceRequestedEvent(
    AbsenceId AbsenceId,
    Guid TenantId,
    EmployeeId EmployeeId,
    AbsenceType Type,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkDays) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
