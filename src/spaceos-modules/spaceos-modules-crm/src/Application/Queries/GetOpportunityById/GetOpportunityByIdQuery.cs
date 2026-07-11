using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunityById;

/// <summary>
/// Query to get an Opportunity by ID
/// </summary>
public record GetOpportunityByIdQuery : IRequest<Result<OpportunityResponse>>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
}
