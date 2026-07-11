using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record EmployeePersonalDataUpdatedEvent(
    EmployeeId EmployeeId,
    Guid TenantId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
