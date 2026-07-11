using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.QualifyLead;

/// <summary>
/// Command to qualify a Lead (requires at least 1 activity logged)
/// </summary>
public record QualifyLeadCommand : IRequest<Result>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
}
