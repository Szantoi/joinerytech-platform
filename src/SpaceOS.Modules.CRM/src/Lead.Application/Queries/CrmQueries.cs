using Ardalis.Result;
using MediatR;

namespace SpaceOS.Modules.CRM.Application.Queries;

/// <summary>
/// Query: Get paginated list of leads.
/// RLS: Filtered by tenant_id and current user (or all if has crm.admin role).
/// </summary>
public sealed record GetLeadsQuery : IRequest<Result<PaginatedResponse<LeadDto>>>
{
    public Guid TenantId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50;
    public string? StatusFilter { get; init; } // "New", "Contacted", "Qualified", "Disqualified", "Opportunity"
    public Guid? AssignedToUserIdFilter { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get single lead by ID.
/// RLS: Only if in tenant and (assigned to user or user has crm.admin).
/// </summary>
public sealed record GetLeadByIdQuery : IRequest<Result<LeadDto>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get leads filtered by status.
/// </summary>
public sealed record GetLeadsByStatusQuery : IRequest<Result<List<LeadDto>>>
{
    public Guid TenantId { get; init; }
    public string Status { get; init; } = string.Empty;
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get paginated list of opportunities.
/// RLS: Filtered by tenant_id and assignment.
/// </summary>
public sealed record GetOpportunitiesQuery : IRequest<Result<PaginatedResponse<OpportunityDto>>>
{
    public Guid TenantId { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50;
    public string? StatusFilter { get; init; }
    public Guid? AssignedToUserIdFilter { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get single opportunity by ID.
/// RLS: Only if in tenant and accessible to user.
/// </summary>
public sealed record GetOpportunityByIdQuery : IRequest<Result<OpportunityDto>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get opportunities ready for quote conversion (status = SolutionAssembly).
/// For integration with Sales/Quote module.
/// </summary>
public sealed record GetOpportunitiesForQuoteConversionQuery : IRequest<Result<List<OpportunityDto>>>
{
    public Guid TenantId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get activities for a lead.
/// </summary>
public sealed record GetLeadActivitiesQuery : IRequest<Result<List<ActivityDto>>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get activities for an opportunity.
/// </summary>
public sealed record GetOpportunityActivitiesQuery : IRequest<Result<List<ActivityDto>>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get tasks for a lead.
/// </summary>
public sealed record GetLeadTasksQuery : IRequest<Result<List<TaskDto>>>
{
    public Guid TenantId { get; init; }
    public Guid LeadId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get tasks for an opportunity.
/// </summary>
public sealed record GetOpportunityTasksQuery : IRequest<Result<List<TaskDto>>>
{
    public Guid TenantId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid RequestingUserId { get; init; }
}

/// <summary>
/// Query: Get pipeline forecast (opportunities by status with totals and probabilities).
/// Used for sales forecasting dashboards.
/// </summary>
public sealed record GetPipelineForecastQuery : IRequest<Result<PipelineForecastDto>>
{
    public Guid TenantId { get; init; }
    public Guid RequestingUserId { get; init; }
    public DateTime? AsOf { get; init; } // Forecast as of date (default: today)
}

/// <summary>
/// DTO: Lead response.
/// </summary>
public sealed class LeadDto
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
    public string AssignedToUserName { get; set; } = string.Empty;
    public Guid? OpportunityRef { get; set; }
    public int ActivityCount { get; set; }
    public int TaskCount { get; set; }
    public int OpenTaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
}

/// <summary>
/// DTO: Opportunity response.
/// </summary>
public sealed class OpportunityDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? LeadId { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string ContactName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Company { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal EstimatedValue { get; set; }
    public string Currency { get; set; } = "HUF";
    public decimal? FinalValue { get; set; }
    public decimal Probability { get; set; } // 0-100
    public DateTime? ExpectedCloseDate { get; set; }
    public Guid AssignedToUserId { get; set; }
    public string AssignedToUserName { get; set; } = string.Empty;
    public Guid? OrderRef { get; set; }
    public Guid? QuoteRef { get; set; }
    public string? LossReason { get; set; }
    public string? CompetitorName { get; set; }
    public int ActivityCount { get; set; }
    public int TaskCount { get; set; }
    public int OpenTaskCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByName { get; set; }
}

/// <summary>
/// DTO: Activity (call, email, meeting, note).
/// </summary>
public sealed class ActivityDto
{
    public string Type { get; set; } = string.Empty; // "Call", "Email", "Meeting", "Note"
    public string Description { get; set; } = string.Empty;
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO: Task (to-do item linked to Lead/Opportunity).
/// </summary>
public sealed class TaskDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public string Priority { get; set; } = "medium";
    public bool IsCompleted { get; set; }
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO: Pipeline forecast for sales forecasting.
/// </summary>
public sealed class PipelineForecastDto
{
    public Guid TenantId { get; set; }
    public DateTime AsOf { get; set; }
    public List<PipelineStageDto> Stages { get; set; } = [];

    /// Total pipeline value (sum of all opportunities × probability)
    public decimal WeightedTotalValue { get; set; }
    public string Currency { get; set; } = "HUF";
}

/// <summary>
/// DTO: Single pipeline stage in forecast.
/// </summary>
public sealed class PipelineStageDto
{
    public string Status { get; set; } = string.Empty; // "Open", "NeedsAssessment", "SolutionAssembly", etc.
    public int Count { get; set; } // Number of opportunities in this stage
    public decimal TotalValue { get; set; } // Sum of estimated values
    public decimal AverageProbability { get; set; } // Average win probability for stage
    public decimal WeightedValue { get; set; } // TotalValue × AverageProbability
}

/// <summary>
/// Generic paginated response wrapper.
/// </summary>
public sealed class PaginatedResponse<T>
{
    public List<T> Data { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore => (Page - 1) * PageSize + Data.Count < Total;
}
