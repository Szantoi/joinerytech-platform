using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.ProposeOpportunity;

/// <summary>
/// Command to propose an Opportunity (Draft → Proposal, probability 30%)
/// </summary>
public record ProposeOpportunityCommand : IRequest<Result>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public DateTime ExpectedCloseDate { get; init; }
}
