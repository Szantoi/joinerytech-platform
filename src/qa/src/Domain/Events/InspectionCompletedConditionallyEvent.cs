using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

/// <summary>
/// Raised when an inspection completes with Conditional result (ADR-063:
/// "passed with minor defects — repair and re-check"). Carries everything the
/// rework Ticket spawn needs (inspector as reporter, order/product scope,
/// documented failure types).
/// </summary>
public record InspectionCompletedConditionallyEvent(
    InspectionId InspectionId,
    Guid TenantId,
    QACheckpointId CheckpointId,
    Guid? OrderId,
    Guid? ProductId,
    Guid InspectorId,
    List<FailureType> FailureTypes) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
