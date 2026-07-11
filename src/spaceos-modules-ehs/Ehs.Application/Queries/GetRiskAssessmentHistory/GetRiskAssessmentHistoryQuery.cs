namespace Ehs.Application.Queries.GetRiskAssessmentHistory;

/// <summary>
/// Query to get paginated risk assessment history for the current organization.
/// Security: Uses ICurrentUserService for tenant isolation (v3-H2 fix).
/// Performance: Implements pagination to prevent large result sets (v3-H1 fix).
/// </summary>
public record GetRiskAssessmentHistoryQuery(
    int Page = 1,
    int PageSize = 20
);

/// <summary>
/// Paginated response for risk assessment history.
/// </summary>
public record PagedRiskAssessmentResponse(
    List<RiskAssessmentHistoryDto> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

/// <summary>
/// Simplified DTO for history list (less data than detail view).
/// </summary>
public record RiskAssessmentHistoryDto(
    Guid Id,
    int AssessmentId,
    int RiskScoreBefore,
    int RiskScoreAfter,
    int ImprovementScore,
    string Category,
    string CreatedBy,
    DateTime CreatedAt
);
