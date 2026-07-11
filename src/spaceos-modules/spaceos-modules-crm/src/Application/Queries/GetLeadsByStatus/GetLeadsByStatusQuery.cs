using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetLeadsByStatus;

/// <summary>
/// Query to get Leads by status
/// </summary>
public record GetLeadsByStatusQuery : IRequest<Result<IReadOnlyList<LeadResponse>>>
{
    public string Status { get; init; } = string.Empty;
    public Guid TenantId { get; init; }
}
