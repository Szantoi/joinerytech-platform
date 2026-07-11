using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries.GetPortfolioCostAdjustments;

/// <summary>
/// Query: Get portfolio-level cost adjustments
/// </summary>
public record GetPortfolioCostAdjustmentsQuery(
    Guid TenantId
) : IRequest<Result<IReadOnlyList<CostAdjustmentListDto>>>;
