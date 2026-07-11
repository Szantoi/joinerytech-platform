using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.ConvertLeadToOpportunity;

/// <summary>
/// Command to convert a qualified Lead to an Opportunity
/// </summary>
public record ConvertLeadToOpportunityCommand : IRequest<Result<Guid>>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
    public decimal EstimatedValue { get; init; }
    public string Currency { get; init; } = "HUF";
}
