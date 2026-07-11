using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.WinOpportunity;

/// <summary>
/// Command to mark an Opportunity as Won
/// </summary>
public record WinOpportunityCommand : IRequest<Result>
{
    public Guid OpportunityId { get; init; }
    public Guid TenantId { get; init; }
    public Guid WonBy { get; init; }
}
