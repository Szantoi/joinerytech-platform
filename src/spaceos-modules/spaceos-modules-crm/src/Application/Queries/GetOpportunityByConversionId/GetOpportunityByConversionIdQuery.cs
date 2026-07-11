using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOpportunityByConversionId;

/// <summary>
/// Query to get Opportunity by ConversionId (ADR-063)
/// Used for polling conversion status
/// </summary>
public record GetOpportunityByConversionIdQuery : IRequest<Result<OpportunityResponse>>
{
    public Guid ConversionId { get; init; }
    public Guid TenantId { get; init; }
}
