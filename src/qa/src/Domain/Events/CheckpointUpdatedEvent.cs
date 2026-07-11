using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record CheckpointUpdatedEvent(
    QACheckpointId CheckpointId,
    Guid TenantId,
    string Name,
    CriticalLevel CriticalLevel) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
