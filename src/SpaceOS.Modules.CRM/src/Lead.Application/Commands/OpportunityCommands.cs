using Ardalis.Result;
using MediatR;

namespace SpaceOS.Modules.CRM.Application.Commands;

/// <summary>
/// Create new opportunity (direct creation, not from lead).
/// Initiates in "Open" status.
/// </summary>
public sealed record CreateOpportunityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid CustomerId { get; init; }
    public string ContactName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string? Phone { get; init; }
    public string? Company { get; init; }
    public string Title { get; init; } = string.Empty;
    public decimal EstimatedValue { get; init; }
    public string Currency { get; init; } = "HUF";
    public DateTime? ExpectedCloseDate { get; init; }
    public Guid AssignedToUserId { get; init; }
    public Guid CreatedBy { get; init; }
}

/// <summary>
/// Start needs assessment phase (Open → NeedsAssessment).
/// Probability updated to 25%.
/// </summary>
public sealed record StartNeedsAssessmentCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Start solution assembly phase (NeedsAssessment → SolutionAssembly).
/// Probability updated to 50%.
/// </summary>
public sealed record StartSolutionAssemblyCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Send proposal/quote (SolutionAssembly → Proposal).
/// Links opportunity to Quote ID.
/// Probability updated to 75%.
/// </summary>
public sealed record SendProposalCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid QuoteId { get; init; }
    public Guid SentBy { get; init; }
}

/// <summary>
/// Start negotiation phase (Proposal → Negotiation).
/// Probability updated to 90%.
/// </summary>
public sealed record StartNegotiationCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>
/// Win opportunity (Negotiation → Won).
/// Links to Order ID, sets final value.
/// Probability set to 100%.
/// </summary>
public sealed record WinOpportunityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid OrderId { get; init; }
    public decimal? FinalValue { get; init; }
    public Guid WonBy { get; init; }
}

/// <summary>
/// Lose opportunity (Proposal/Negotiation → Lost).
/// Probability set to 0%.
/// </summary>
public sealed record LoseOpportunityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public string? Reason { get; init; }
    public string? CompetitorName { get; init; }
    public Guid LostBy { get; init; }
}

/// <summary>
/// Abandon opportunity (any status except terminal → Abandoned).
/// Requires abandonment reason.
/// Probability set to 0%.
/// </summary>
public sealed record AbandonOpportunityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public string Reason { get; init; } = string.Empty;
    public Guid AbandonedBy { get; init; }
}

/// <summary>
/// Update estimated value or win probability.
/// </summary>
public sealed record UpdateOpportunityEstimateCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public decimal? NewValue { get; init; }
    public string? Currency { get; init; }
    public decimal? NewProbability { get; init; }
    public Guid UpdatedBy { get; init; }
}

/// <summary>
/// Reassign opportunity to another sales rep.
/// </summary>
public sealed record ReassignOpportunityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid ToUserId { get; init; }
    public Guid ReassignedBy { get; init; }
}

/// <summary>
/// Log activity on opportunity (call, email, meeting, note).
/// </summary>
public sealed record LogOpportunityActivityCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public string ActivityType { get; init; } = string.Empty; // "Call", "Email", "Meeting", "Note"
    public string Description { get; init; } = string.Empty;
    public Guid LoggedBy { get; init; }
}

/// <summary>
/// Create task for opportunity.
/// </summary>
public sealed record CreateOpportunityTaskCommand : IRequest<Result<OpportunityResponse>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime DueDate { get; init; }
    public string Priority { get; init; } = "medium"; // "high", "medium", "low"
    public Guid CreatedBy { get; init; }
}

/// <summary>
/// DTO response for Opportunity operations.
/// </summary>
public sealed class OpportunityResponse
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? LeadId { get; set; }
    public Guid CustomerId { get; set; }
    public string ContactName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public string Currency { get; set; } = "HUF";
    public decimal? FinalValue { get; set; }
    public decimal Probability { get; set; }
    public DateTime? ExpectedCloseDate { get; set; }
    public Guid AssignedToUserId { get; set; }
    public Guid? OrderRef { get; set; }
    public Guid? QuoteRef { get; set; }
    public string? LossReason { get; set; }
    public string? CompetitorName { get; set; }
    public int ActivityCount { get; set; }
    public int TaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
