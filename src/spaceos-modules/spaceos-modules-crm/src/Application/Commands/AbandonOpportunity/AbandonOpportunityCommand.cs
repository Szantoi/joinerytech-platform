using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.AbandonOpportunity;

/// <summary>
/// Command to abandon an Opportunity (Draft/Proposal → Abandoned)
/// </summary>
public record AbandonOpportunityCommand : IRequest<Result>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid AbandonedBy { get; init; }
}
