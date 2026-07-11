using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.DisqualifyLead;

/// <summary>
/// Command to disqualify a Lead with a reason
/// </summary>
public record DisqualifyLeadCommand : IRequest<Result>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
    public string Reason { get; init; } = string.Empty;
}
