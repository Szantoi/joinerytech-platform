using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.Kontrolling.Application.DTOs;

namespace SpaceOS.Modules.Kontrolling.Application.Queries;

/// <summary>
/// Query: Get portfolio-level cost summary across all active projects
/// </summary>
public record GetPortfolioSummaryQuery(Guid TenantId) : IRequest<Result<PortfolioSummaryDto>>;
