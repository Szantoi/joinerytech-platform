using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: risk assessment approved (FSM: UnderReview → Approved)
/// </summary>
public record RiskAssessmentApprovedEvent(
    Guid RiskAssessmentId,
    RiskLevel RiskLevel
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
