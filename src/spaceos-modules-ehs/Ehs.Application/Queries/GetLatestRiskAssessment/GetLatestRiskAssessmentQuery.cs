namespace Ehs.Application.Queries.GetLatestRiskAssessment;

/// <summary>
/// Query to get the latest risk assessment for the current organization.
/// Security: Uses ICurrentUserService for tenant isolation (v3-H2 IDOR fix).
/// </summary>
public record GetLatestRiskAssessmentQuery();

/// <summary>
/// Response DTO for the latest risk assessment.
/// </summary>
public record RiskAssessmentDto(
    Guid Id,
    int AssessmentId,
    int LikelihoodBefore,
    int SeverityBefore,
    int LikelihoodAfter,
    int SeverityAfter,
    int RiskScoreBefore,
    int RiskScoreAfter,
    int ImprovementScore,
    string Category,
    string Notes,
    string CreatedBy,
    DateTime CreatedAt,
    string DataHash
);
