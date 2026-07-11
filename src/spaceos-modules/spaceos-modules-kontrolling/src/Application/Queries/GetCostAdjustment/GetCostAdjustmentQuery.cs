using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetCostAdjustment;

/// <summary>
/// Query: Get cost adjustment by ID
/// </summary>
public record GetCostAdjustmentQuery(
    Guid CostAdjustmentId,
    Guid TenantId
) : IRequest<Result<CostAdjustmentDto>>;
