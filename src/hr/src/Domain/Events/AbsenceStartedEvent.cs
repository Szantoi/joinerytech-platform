using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record AbsenceStartedEvent(
    AbsenceId AbsenceId,
    Guid TenantId,
    EmployeeId EmployeeId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
