using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record InspectionCompletedEvent(
    InspectionId InspectionId,
    Guid TenantId,
    QACheckpointId CheckpointId,
    InspectionResult Result,
    Guid? OrderId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
