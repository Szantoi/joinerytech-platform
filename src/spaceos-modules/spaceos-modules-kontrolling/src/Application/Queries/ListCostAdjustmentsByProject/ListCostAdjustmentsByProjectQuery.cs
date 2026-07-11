using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.ListCostAdjustmentsByProject;

/// <summary>
/// Query: List cost adjustments for a specific project
/// </summary>
public record ListCostAdjustmentsByProjectQuery(
    Guid ProjectId,
    Guid TenantId
) : IRequest<Result<IReadOnlyList<CostAdjustmentListDto>>>;
