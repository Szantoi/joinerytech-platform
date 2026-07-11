using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

/// <summary>
/// Risk Assessment aggregate root - ISO 45001 compliant 5×5 risk matrix
/// RiskScore = Severity × Likelihood (1-25)
/// RiskLevel: Low (1-5), Medium (6-12), High (15-25)
/// </summary>
public class RiskAssessment : AggregateRoot
{
    private readonly List<RiskControl> _controls = new();

    public Guid RiskAssessmentId { get; private set; }
    public Guid TenantId { get; private set; }
    public string HazardDescription { get; private set; } = string.Empty;
    public Severity Severity { get; private set; }
    public Likelihood Likelihood { get; private set; }
    public int RiskScore { get; private set; }
    public RiskLevel RiskLevel { get; private set; }
    public Guid AssessedBy { get; private set; }
    public DateTimeOffset AssessedAt { get; private set; }
    public DateTimeOffset ReviewDueDate { get; private set; }
    public RiskStatus Status { get; private set; }

    // Navigation
    public IReadOnlyList<RiskControl> Controls => _controls.AsReadOnly();

    private RiskAssessment() { }  // EF Core

    /// <summary>
    /// Create new risk assessment with automatic risk score and level calculation
    /// </summary>
    public static RiskAssessment Create(
        Guid tenantId,
        string hazardDescription,
        Severity severity,
        Likelihood likelihood,
        Guid assessedBy,
        DateTimeOffset reviewDueDate)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(hazardDescription))
            throw new ArgumentException("HazardDescription is required", nameof(hazardDescription));

        if (assessedBy == Guid.Empty)
            throw new ArgumentException("AssessedBy is required", nameof(assessedBy));

        if (reviewDueDate < DateTimeOffset.UtcNow)
            throw new ArgumentException("ReviewDueDate cannot be in the past", nameof(reviewDueDate));

        var riskScore = CalculateRiskScore(severity, likelihood);
        var riskLevel = CalculateRiskLevel(riskScore);

        var assessment = new RiskAssessment
        {
            RiskAssessmentId = Guid.NewGuid(),
            TenantId = tenantId,
            HazardDescription = hazardDescription,
            Severity = severity,
            Likelihood = likelihood,
            RiskScore = riskScore,
            RiskLevel = riskLevel,
            AssessedBy = assessedBy,
            AssessedAt = DateTimeOffset.UtcNow,
            ReviewDueDate = reviewDueDate,
            Status = RiskStatus.Active
        };

        assessment.AddDomainEvent(new RiskAssessmentCreatedEvent(
            assessment.RiskAssessmentId,
            assessment.RiskLevel));

        return assessment;
    }

    /// <summary>
    /// 5×5 Risk Matrix calculation: Severity × Likelihood
    /// </summary>
    private static int CalculateRiskScore(Severity severity, Likelihood likelihood)
    {
        return (int)severity * (int)likelihood;  // Range: 1-25
    }

    /// <summary>
    /// Determine risk level from risk score
    /// Low: 1-5, Medium: 6-12, High: 15-25
    /// Note: Gap at 13-14 intentionally forces conservative categorization
    /// </summary>
    private static RiskLevel CalculateRiskLevel(int riskScore)
    {
        return riskScore switch
        {
            >= 1 and <= 5 => RiskLevel.Low,
            >= 6 and <= 12 => RiskLevel.Medium,
            >= 15 and <= 25 => RiskLevel.High,
            _ => throw new ArgumentOutOfRangeException(nameof(riskScore), "RiskScore must be 1-25")
        };
    }

    /// <summary>
    /// Add risk control/mitigation measure
    /// </summary>
    public void AddControl(string controlMeasure, string responsiblePerson)
    {
        if (Status != RiskStatus.Active)
            throw new InvalidOperationException("Cannot add controls to archived risk assessment");

        var control = new RiskControl(RiskAssessmentId, controlMeasure, responsiblePerson);
        _controls.Add(control);

        AddDomainEvent(new RiskControlAddedEvent(RiskAssessmentId, control.RiskControlId));
    }

    /// <summary>
    /// Archive risk assessment (no longer active)
    /// </summary>
    public void Archive()
    {
        if (Status == RiskStatus.Archived)
            throw new InvalidOperationException("Risk assessment already archived");

        Status = RiskStatus.Archived;

        AddDomainEvent(new RiskAssessmentArchivedEvent(RiskAssessmentId));
    }
}
