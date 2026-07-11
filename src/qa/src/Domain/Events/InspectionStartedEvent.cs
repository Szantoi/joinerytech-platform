using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record InspectionStartedEvent(
    InspectionId InspectionId,
    Guid TenantId,
    QACheckpointId CheckpointId,
    Guid InspectorEmployeeId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
