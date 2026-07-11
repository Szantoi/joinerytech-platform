using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunityForecast;

/// <summary>
/// Query to get weighted opportunity forecast for a tenant
/// </summary>
public record GetOpportunityForecastQuery : IRequest<Result<OpportunityForecastResponse>>
{
    public Guid TenantId { get; init; }
    public string Currency { get; init; } = "HUF";
}
