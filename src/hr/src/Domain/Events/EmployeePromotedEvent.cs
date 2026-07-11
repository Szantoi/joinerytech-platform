using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record EmployeePromotedEvent(
    EmployeeId EmployeeId,
    Guid TenantId,
    string NewPayGrade,
    decimal NewHourlyRate) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
