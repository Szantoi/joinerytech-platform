using MediatR;
using Ardalis.Result;
using SpaceOS.Modules.CRM.Application.DTOs;

namespace SpaceOS.Modules.CRM.Application.Queries.GetOverdueTasks;

/// <summary>
/// Query to get all overdue tasks for a tenant
/// </summary>
public record GetOverdueTasksQuery : IRequest<Result<IReadOnlyList<CrmTaskResponse>>>
{
    public Guid TenantId { get; init; }
}
