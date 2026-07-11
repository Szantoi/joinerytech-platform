using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record InspectionPlannedEvent(
    InspectionId InspectionId,
    Guid TenantId,
    QACheckpointId CheckpointId,
    Guid InspectorId,
    DateTime PlannedAt) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
