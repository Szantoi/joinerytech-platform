using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Application.Commands;

/// <summary>
/// Create new lead in CRM.
/// Initiates lead in "New" status, assigns to sales rep.
/// </summary>
public sealed record CreateLeadCommand : IRequest<Result<LeadResponse>>
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
public sealed record ContactLeadCommand : IRequest<Result<LeadResponse>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string? Notes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Transition lead from Contacted → Qualified.
/// </summary>
public sealed record QualifyLeadCommand : IRequest<Result<LeadResponse>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public string? QualificationNotes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Disqualify lead (from New, Contacted, or Qualified).
/// </summary>
public sealed record DisqualifyLeadCommand : IRequest<Result<LeadResponse>>
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
public sealed record ConvertToOpportunityCommand : IRequest<Result<LeadResponse>>
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
public sealed record ReassignLeadCommand : IRequest<Result<LeadResponse>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid ToUserId { get; init; }
    public Guid ReassignedBy { get; init; }
}

/// <summary>
/// Log activity on lead (call, email, meeting, note).
/// </summary>
public sealed record LogLeadActivityCommand : IRequest<Result<LeadResponse>>
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
public sealed record CreateLeadTaskCommand : IRequest<Result<LeadResponse>>
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
public sealed record CompleteLeadTaskCommand : IRequest<Result<LeadResponse>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid TaskId { get; init; }
    public Guid CompletedBy { get; init; }
}

/// <summary>
/// Update contact information on lead.
/// </summary>
public sealed record UpdateLeadContactInfoCommand : IRequest<Result<LeadResponse>>
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
public sealed record DeleteLeadCommand : IRequest<Result<Unit>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid DeletedBy { get; init; }
}

/// <summary>
/// DTO response for Lead operations.
/// </summary>
public sealed class LeadResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string Source { get; set; } = string.Empty;
    public Guid AssignedToUserId { get; set; }
    public Guid? OpportunityRef { get; set; }
    public int ActivityCount { get; set; }
    public int TaskCount { get; set; }
    public int OpenTaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
