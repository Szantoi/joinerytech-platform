using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.AddOpportunityActivity;

/// <summary>
/// Command to add an activity to an Opportunity
/// </summary>
public record AddOpportunityActivityCommand : IRequest<Result<Guid>>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public string ActivityType { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public Guid CreatedBy { get; init; }
}
