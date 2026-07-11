using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Events;

public record EmployeeSkillUpdatedEvent(
    EmployeeId EmployeeId,
    Guid TenantId,
    SkillKey SkillKey,
    SkillLevel OldLevel,
    SkillLevel NewLevel) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
