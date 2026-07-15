using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: risk assessment submitted for review (FSM: Draft → UnderReview)
/// </summary>
public record RiskAssessmentSubmittedForReviewEvent(
    Guid RiskAssessmentId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
