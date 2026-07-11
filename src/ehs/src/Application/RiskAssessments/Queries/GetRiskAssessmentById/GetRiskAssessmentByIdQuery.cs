using MediatR;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskAssessmentById;

public record GetRiskAssessmentByIdQuery(
    Guid RiskAssessmentId,
    Guid TenantId
) : IRequest<RiskAssessmentDto?>;
