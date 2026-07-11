using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.ListRiskAssessments;

public record ListRiskAssessmentsQuery(
    Guid TenantId,
    RiskAssessmentFilter Filter
) : IRequest<List<RiskAssessmentListItemDto>>;
