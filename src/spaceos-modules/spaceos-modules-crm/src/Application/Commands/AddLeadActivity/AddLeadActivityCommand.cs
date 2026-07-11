using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.AddLeadActivity;

/// <summary>
/// Command to add an activity to a Lead
/// </summary>
public record AddLeadActivityCommand : IRequest<Result<Guid>>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
    public string ActivityType { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public Guid CreatedBy { get; init; }
}
