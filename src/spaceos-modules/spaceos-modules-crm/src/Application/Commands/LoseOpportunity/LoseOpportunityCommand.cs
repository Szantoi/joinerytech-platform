using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.LoseOpportunity;

/// <summary>
/// Command to mark an Opportunity as Lost
/// </summary>
public record LoseOpportunityCommand : IRequest<Result>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid LostBy { get; init; }
}
