using MediatR;
using Ardalis.Result;

namespace SpaceOS.Modules.CRM.Application.Commands.CreateOpportunity;

/// <summary>
/// Command to create a new Opportunity (standalone, not from Lead)
/// </summary>
public record CreateOpportunityCommand : IRequest<Result<Guid>>
{
    public Guid TenantId { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public decimal EstimatedValue { get; init; }
    public string Currency { get; init; } = "HUF";
    public Guid AssignedTo { get; init; }
}
