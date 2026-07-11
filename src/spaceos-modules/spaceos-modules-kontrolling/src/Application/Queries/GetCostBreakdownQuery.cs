using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Query: Get detailed cost breakdown (cost summary with margins)
/// </summary>
public record GetCostBreakdownQuery(Guid ProjectId, Guid TenantId) : IRequest<Result<CostSummaryDto>>;
