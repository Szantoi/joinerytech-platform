using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: risk assessment returned to draft for rework (FSM: UnderReview → Draft)
/// </summary>
public record RiskAssessmentReturnedToDraftEvent(
    Guid RiskAssessmentId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
