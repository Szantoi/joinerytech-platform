using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.ContactLead;

/// <summary>
/// Command to mark a Lead as contacted
/// </summary>
public record ContactLeadCommand : IRequest<Result>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
}
