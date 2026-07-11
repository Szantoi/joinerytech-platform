using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record InspectionFailedEvent(
    InspectionId InspectionId,
    Guid TenantId,
    QACheckpointId CheckpointId,
    Guid? OrderId,
    List<FailureType> FailureTypes) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
