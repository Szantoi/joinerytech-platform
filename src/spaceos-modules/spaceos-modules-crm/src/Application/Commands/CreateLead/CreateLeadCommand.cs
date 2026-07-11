using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateLead;

/// <summary>
/// Command to create a new Lead
/// </summary>
public record CreateLeadCommand : IRequest<Result<Guid>>
{
    public Guid TenantId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public string Source { get; init; } = string.Empty;
    public Guid AssignedTo { get; init; }
}
