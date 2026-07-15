using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: risk assessment details updated in Draft (score/band recalculated)
/// </summary>
public record RiskAssessmentUpdatedEvent(
    Guid RiskAssessmentId,
    RiskLevel RiskLevel
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
