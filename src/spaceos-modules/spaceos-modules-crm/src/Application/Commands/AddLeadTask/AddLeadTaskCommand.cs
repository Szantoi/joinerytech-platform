using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.AddLeadTask;

/// <summary>
/// Command to add a task to a Lead
/// </summary>
public record AddLeadTaskCommand : IRequest<Result<Guid>>
{
    public Guid LeadId { get; init; }
    public Guid TenantId { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime DueDate { get; init; }
    public string Priority { get; init; } = "Medium";
    public Guid CreatedBy { get; init; }
}
