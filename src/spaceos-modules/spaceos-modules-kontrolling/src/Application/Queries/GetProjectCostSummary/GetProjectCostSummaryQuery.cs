namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetProjectCostSummary;

using MediatR;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

/// <summary>
/// Query to get project cost summary
/// </summary>
public record GetProjectCostSummaryQuery(
    Guid ProjectId,
    Guid TenantId
) : IRequest<CostSummaryDto>;
