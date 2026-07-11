using System.Security.Cryptography;
using System.Text;
using Ehs.Domain.Exceptions;

namespace Ehs.Domain.Entities;

/// <summary>
/// Risk Assessment entity for EHS module.
/// Represents a workplace risk assessment with likelihood, severity, and mitigation measures.
/// </summary>
public class RiskAssessment
{
    public Guid Id { get; private set; }
    public Guid OrganizationId { get; private set; }
    public int AssessmentId { get; private set; }
    public int LikelihoodBefore { get; private set; }
    public int SeverityBefore { get; private set; }
    public int LikelihoodAfter { get; private set; }
    public int SeverityAfter { get; private set; }
    public string Category { get; private set; } = string.Empty;
    public string Notes { get; private set; } = string.Empty;
    public string CreatedBy { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public string DataHash { get; private set; } = string.Empty;

    // Calculated properties
    public int RiskScoreBefore => LikelihoodBefore * SeverityBefore;
    public int RiskScoreAfter => LikelihoodAfter * SeverityAfter;
    public int ImprovementScore => RiskScoreBefore - RiskScoreAfter;

    private RiskAssessment() { }

    /// <summary>
    /// Factory method to create a new RiskAssessment with domain validation.
    /// </summary>
    public static RiskAssessment Create(
        Guid organizationId,
        int assessmentId,
        int likelihoodBefore,
        int severityBefore,
        int likelihoodAfter,
        int severityAfter,
        string category,
        string notes,
        string createdBy)
    {
        // Validate likelihood and severity range (1-5)
        ValidateLikelihood(likelihoodBefore, nameof(likelihoodBefore));
        ValidateSeverity(severityBefore, nameof(severityBefore));
        ValidateLikelihood(likelihoodAfter, nameof(likelihoodAfter));
        ValidateSeverity(severityAfter, nameof(severityAfter));

        // Domain validation (v4-M3): High-risk (score > 15) requires notes
        var riskScore = likelihoodBefore * severityBefore;
        if (riskScore > 15 && string.IsNullOrWhiteSpace(notes))
        {
            throw new DomainException("High-risk assessments (score > 15) require mitigation notes");
        }

        var assessment = new RiskAssessment
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            AssessmentId = assessmentId,
            LikelihoodBefore = likelihoodBefore,
            SeverityBefore = severityBefore,
            LikelihoodAfter = likelihoodAfter,
            SeverityAfter = severityAfter,
            Category = category,
            Notes = notes ?? string.Empty,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        // Compute data hash
        assessment.DataHash = assessment.ComputeHash();

        return assessment;
    }

    private static void ValidateLikelihood(int likelihood, string paramName)
    {
        if (likelihood < 1 || likelihood > 5)
        {
            throw new ArgumentException("Likelihood must be between 1 and 5", paramName);
        }
    }

    private static void ValidateSeverity(int severity, string paramName)
    {
        if (severity < 1 || severity > 5)
        {
            throw new ArgumentException("Severity must be between 1 and 5", paramName);
        }
    }

    private string ComputeHash()
    {
        var data = $"{OrganizationId}|{AssessmentId}|{LikelihoodBefore}|{SeverityBefore}|{LikelihoodAfter}|{SeverityAfter}|{Category}|{Notes}|{CreatedBy}|{CreatedAt:O}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(data));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
