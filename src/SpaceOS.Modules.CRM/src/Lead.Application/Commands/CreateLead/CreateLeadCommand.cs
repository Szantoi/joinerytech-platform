namespace SpaceOS.Modules.Procurement.Application.Commands.CreateLead;

using MediatR;
using Ardalis.Result;

/// <summary>
/// Command to Create Lead
/// </summary>
public record CreateLeadCommand : IRequest<Result>
{
    public Guid TenantId { get; init; }
    public string name { get; init; }
    public string email { get; init; }
    public string? phone { get; init; }
    public string? company { get; init; }
    public string source { get; init; }
    public Guid assignedTo { get; init; }
}
