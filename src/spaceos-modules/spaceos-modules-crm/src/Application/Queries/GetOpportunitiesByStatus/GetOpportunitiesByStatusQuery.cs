using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunitiesByStatus;

/// <summary>
/// Query to get Opportunities by status
/// </summary>
public record GetOpportunitiesByStatusQuery : IRequest<Result<IReadOnlyList<OpportunityResponse>>>
{
    public string Status { get; init; } = string.Empty;
    public Guid TenantId { get; init; }
}
