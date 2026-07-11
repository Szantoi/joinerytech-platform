using MediatR;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Commands.CloseRiskAssessment;

public record CloseRiskAssessmentCommand(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<Unit>;
