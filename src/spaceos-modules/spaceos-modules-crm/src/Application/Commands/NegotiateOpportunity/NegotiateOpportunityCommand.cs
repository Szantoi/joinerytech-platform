using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.NegotiateOpportunity;

/// <summary>
/// Command to move Opportunity to negotiation (Proposal → Negotiation, probability 60%)
/// </summary>
public record NegotiateOpportunityCommand : IRequest<Result>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public decimal? UpdatedValue { get; init; }
    public string? UpdatedCurrency { get; init; }
    public decimal? UpdatedProbability { get; init; }
}
