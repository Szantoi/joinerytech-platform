using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record EmployeeSkillRemovedEvent(
    EmployeeId EmployeeId,
    Guid TenantId,
    SkillKey SkillKey) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
