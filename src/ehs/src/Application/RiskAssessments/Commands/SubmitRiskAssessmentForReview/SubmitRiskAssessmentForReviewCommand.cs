using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.SubmitRiskAssessmentForReview;

/// <summary>FSM: Draft → UnderReview</summary>
public record SubmitRiskAssessmentForReviewCommand(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<Unit>;
