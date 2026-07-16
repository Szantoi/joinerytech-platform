using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Application.Queries;

/// <summary>
/// Cross-entity CRM queries — tasks and activities live as child entities on BOTH
/// the Lead and the Opportunity aggregate, but the portal presents them as single
/// flat lists (Feladatok screen, "Legutóbbi tevékenységek" panel).
///
/// Contract mirror: <c>modules/crm/mocks/handlers.tasks.ts</c>
/// (<c>GET /api/crm/tasks</c>, <c>GET /api/crm/activities/recent</c>).
/// </summary>

/// <summary>
/// Query: flat task list across leads and opportunities, earliest due date first
/// (SLA breaches surface at the top — the portal's ordering).
/// </summary>
public sealed record GetCrmTasksQuery : IRequest<Result<CrmTaskListItemDto[]>>
{
    public Guid TenantId { get; init; }

    /// <summary>Filter on completion state; null = all tasks.</summary>
    public bool? Done { get; init; }
}

/// <summary>
/// Query: the most recent activities across leads and opportunities, newest first.
/// </summary>
public sealed record GetRecentActivitiesQuery : IRequest<Result<RecentActivityDto[]>>
{
    public Guid TenantId { get; init; }

    /// <summary>Page size; null = the configured default (Crm:Activities:RecentLimit).</summary>
    public int? Limit { get; init; }
}

/// <summary>
/// DTO: a task in the flat cross-entity list. <see cref="Sla"/> is COMPUTED
/// (TaskSlaPolicy), never stored.
/// </summary>
public sealed class CrmTaskListItemDto
{
    public Guid Id { get; set; }

    /// <summary>Which aggregate owns the task (portal: refType).</summary>
    public CrmRefType RefType { get; set; }

    /// <summary>Id of the owning lead/opportunity (portal: refId).</summary>
    public Guid RefId { get; set; }

    /// <summary>Contact name (lead) or title (opportunity) — saves the UI a second fetch.</summary>
    public string RefTitle { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public DateTimeOffset DueDate { get; set; }
    public bool IsCompleted { get; set; }

    /// <summary>Computed SLA state (Ok / Soon / Overdue).</summary>
    public TaskSla Sla { get; set; }

    /// <summary>User the owning aggregate is assigned to (portal: owner).</summary>
    public Guid AssignedToUserId { get; set; }
}

/// <summary>
/// DTO: an activity in the cross-entity feed (portal: RecentActivity).
/// </summary>
public sealed class RecentActivityDto
{
    public CrmRefType RefType { get; set; }
    public Guid RefId { get; set; }
    public string RefTitle { get; set; } = string.Empty;

    /// <summary>Activity kind (call, email, meeting, note) — portal: kind.</summary>
    public string Type { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
