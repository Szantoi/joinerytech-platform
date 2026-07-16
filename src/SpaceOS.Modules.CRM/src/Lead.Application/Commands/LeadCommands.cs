using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Application.Queries;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Application.Commands;

/// <summary>
/// Create new lead in CRM.
/// Initiates lead in "New" status, assigns to sales rep.
/// </summary>
public sealed record CreateLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public string ContactName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public LeadSource Source { get; init; }
    public Guid AssignedToUserId { get; init; }
    public string? Notes { get; init; }
    public Guid CreatedBy { get; init; }
}

/// <summary>
/// Transition lead from New → Contacted.
/// </summary>
public sealed record ContactLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string? Notes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Transition lead from Contacted → Qualified.
/// </summary>
public sealed record QualifyLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string? QualificationNotes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Transition lead from Qualified → Nurturing (wire: "nurture").
/// Optional parking state before conversion — added by CRM-BE-HOST to close the
/// FSM gap documented in F2-CRM-FE.
/// </summary>
public sealed record NurtureLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string? Notes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Disqualify lead (from any open status: New, Contacted, Qualified, Nurturing).
/// </summary>
public sealed record DisqualifyLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Convert qualified lead to Opportunity.
/// Requires: Lead status = Qualified.
/// Result: Creates Opportunity aggregate and transitions lead to "Opportunity" status.
/// </summary>
public sealed record ConvertToOpportunityCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid CustomerId { get; init; }
    public string Title { get; init; } = string.Empty;
    public decimal EstimatedValue { get; init; }
    public string Currency { get; init; } = "HUF";
    public DateTime? ExpectedCloseDate { get; init; }
    public Guid ConvertedBy { get; init; }
}

/// <summary>
/// Reassign lead to another sales rep.
/// </summary>
public sealed record ReassignLeadCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid ToUserId { get; init; }
    public Guid ReassignedBy { get; init; }
}

/// <summary>
/// Log activity on lead (call, email, meeting, note).
/// </summary>
public sealed record LogLeadActivityCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string ActivityType { get; init; } = string.Empty; // "Call", "Email", "Meeting", "Note"
    public string Description { get; init; } = string.Empty;
    public Guid LoggedBy { get; init; }
}

/// <summary>
/// Create task for lead.
/// </summary>
public sealed record CreateLeadTaskCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime DueDate { get; init; }
    public string Priority { get; init; } = "medium"; // "high", "medium", "low"
    public Guid CreatedBy { get; init; }
}

/// <summary>
/// Mark task as completed.
/// </summary>
public sealed record CompleteLeadTaskCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid TaskId { get; init; }
    public Guid CompletedBy { get; init; }
}

/// <summary>
/// Mark a task as completed, addressed by task id alone (the owning lead or
/// opportunity is resolved by the handler) — the portal's flat Feladatok list
/// contract (<c>POST /api/crm/tasks/{id}/complete</c>).
/// </summary>
public sealed record CompleteCrmTaskCommand : IRequest<Result<CrmTaskListItemDto>>
{
    public Guid TenantId { get; init; }
    public Guid TaskId { get; init; }
    public Guid CompletedBy { get; init; }
}

/// <summary>
/// Update contact information on lead.
/// </summary>
public sealed record UpdateLeadContactInfoCommand : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string ContactName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public Guid UpdatedBy { get; init; }
}

/// <summary>
/// Delete lead (soft delete — only from New or Disqualified status).
/// </summary>
public sealed record DeleteLeadCommand : IRequest<Result>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid DeletedBy { get; init; }
}
