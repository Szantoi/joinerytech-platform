namespace Ehs.Application.Commands.CreateRiskAssessment;

/// <summary>
/// Command to create a new risk assessment.
/// </summary>
public record CreateRiskAssessmentCommand(
    int AssessmentId,
    int LikelihoodBefore,
    int SeverityBefore,
    int LikelihoodAfter,
    int SeverityAfter,
    string Category,
    string Notes
);

/// <summary>
/// Response DTO for risk assessment creation.
/// </summary>
public record CreateRiskAssessmentResponse(
    Guid Id,
    int RiskScoreBefore,
    int RiskScoreAfter,
    int ImprovementScore,
    string DataHash
);
