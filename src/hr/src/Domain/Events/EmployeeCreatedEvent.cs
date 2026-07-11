using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record EmployeeCreatedEvent(
    EmployeeId EmployeeId,
    Guid TenantId,
    string Name,
    Department Department,
    string Email) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
