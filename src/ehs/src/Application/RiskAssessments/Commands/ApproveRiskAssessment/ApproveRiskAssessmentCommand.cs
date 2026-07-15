using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ApproveRiskAssessment;

/// <summary>FSM: UnderReview → Approved</summary>
public record ApproveRiskAssessmentCommand(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<Unit>;
