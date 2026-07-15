using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.ReturnRiskAssessmentToDraft;

/// <summary>FSM: UnderReview → Draft (reviewer sends it back for rework)</summary>
public record ReturnRiskAssessmentToDraftCommand(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<Unit>;
