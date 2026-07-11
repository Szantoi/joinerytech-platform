using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record CheckpointDeactivatedEvent(
    QACheckpointId CheckpointId,
    Guid TenantId,
    string Name) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
