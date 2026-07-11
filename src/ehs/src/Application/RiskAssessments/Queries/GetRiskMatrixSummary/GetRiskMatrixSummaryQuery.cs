using MediatR;
using SpaceOS.Modules.Ehs.Application.RiskAssessments.DTOs;

namespace SpaceOS.Modules.Ehs.Application.RiskAssessments.Queries.GetRiskMatrixSummary;

public record GetRiskMatrixSummaryQuery(
    Guid TenantId
) : IRequest<RiskMatrixSummaryDto>;
