using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

/// <summary>
/// Risk Assessment aggregate root — ISO 45001 compliant 5×5 risk matrix.
/// RiskScore = Severity × Likelihood (1-25); the band (Low/Medium/High/Critical)
/// comes from the CONFIG-DRIVEN <see cref="RiskBandConfiguration"/> — no hardcoded thresholds.
///
/// FSM (same convention as the other EHS aggregates — illegal transition = 409 at the API):
///
///   Draft → UnderReview → Approved → Archived
///              ↓ (return-to-draft)
///            Draft
///
/// Details (hazard, ratings, location, review date) are editable in Draft only.
/// Control measures use the unified CAPA mechanism: a control can be linked to a
/// CorrectiveAction with Source = RiskAssessment (same board as incidents/safety walks).
/// </summary>
public class RiskAssessment : AggregateRoot
{
    private readonly List<RiskControl> _controls = new();

    public Guid RiskAssessmentId { get; private set; }
    public Guid TenantId { get; private set; }

    /// <summary>Hazard being assessed (veszely)</summary>
    public string HazardDescription { get; private set; } = string.Empty;

    /// <summary>Affected area — optional FK to EhsLocation (erintett terulet)</summary>
    public Guid? LocationId { get; private set; }

    /// <summary>Consequence rating 1-5 (sulyossag)</summary>
    public Severity Severity { get; private set; }

    /// <summary>Probability rating 1-5 (valoszinuseg)</summary>
    public Likelihood Likelihood { get; private set; }

    /// <summary>Computed: Severity × Likelihood (1-25)</summary>
    public int RiskScore { get; private set; }

    /// <summary>Computed band from the configurable thresholds</summary>
    public RiskLevel RiskLevel { get; private set; }

    public Guid AssessedBy { get; private set; }
    public DateTimeOffset AssessedAt { get; private set; }
    public DateTimeOffset ReviewDueDate { get; private set; }
    public RiskStatus Status { get; private set; }

    public DateTimeOffset? SubmittedAt { get; private set; }
    public DateTimeOffset? ApprovedAt { get; private set; }
    public DateTimeOffset? ArchivedAt { get; private set; }

    // Navigation
    public IReadOnlyList<RiskControl> Controls => _controls.AsReadOnly();

    private RiskAssessment() { }  // EF Core

    /// <summary>
    /// FSM entry: create a new risk assessment in Draft with automatic
    /// score and band calculation (band thresholds come from configuration).
    /// </summary>
    public static RiskAssessment Create(
        Guid tenantId,
        string hazardDescription,
        Severity severity,
        Likelihood likelihood,
        Guid assessedBy,
        DateTimeOffset reviewDueDate,
        RiskBandConfiguration bands,
        Guid? locationId = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (assessedBy == Guid.Empty)
            throw new ArgumentException("AssessedBy is required", nameof(assessedBy));

        var assessment = new RiskAssessment
        {
            RiskAssessmentId = Guid.NewGuid(),
            TenantId = tenantId,
            AssessedBy = assessedBy,
            AssessedAt = DateTimeOffset.UtcNow,
            Status = RiskStatus.Draft
        };

        assessment.SetDetails(hazardDescription, severity, likelihood, reviewDueDate, bands, locationId);

        assessment.AddDomainEvent(new RiskAssessmentCreatedEvent(
            assessment.RiskAssessmentId,
            assessment.RiskLevel));

        return assessment;
    }

    /// <summary>
    /// Update the assessment details. Guard: Draft only — after submission the
    /// content is locked (return-to-draft reopens it). Score/band are recalculated.
    /// </summary>
    public void UpdateDetails(
        string hazardDescription,
        Severity severity,
        Likelihood likelihood,
        DateTimeOffset reviewDueDate,
        RiskBandConfiguration bands,
        Guid? locationId = null)
    {
        if (Status != RiskStatus.Draft)
            throw new InvalidOperationException("Only a draft risk assessment can be updated");

        SetDetails(hazardDescription, severity, likelihood, reviewDueDate, bands, locationId);

        AddDomainEvent(new RiskAssessmentUpdatedEvent(RiskAssessmentId, RiskLevel));
    }

    /// <summary>
    /// FSM Transition: Draft → UnderReview (submitted for approval).
    /// </summary>
    public void SubmitForReview()
    {
        if (Status != RiskStatus.Draft)
            throw new InvalidOperationException("Only a draft risk assessment can be submitted for review");

        SubmittedAt = DateTimeOffset.UtcNow;
        Status = RiskStatus.UnderReview;

        AddDomainEvent(new RiskAssessmentSubmittedForReviewEvent(RiskAssessmentId));
    }

    /// <summary>
    /// FSM Transition: UnderReview → Approved (live entry of the risk register).
    /// </summary>
    public void Approve()
    {
        if (Status != RiskStatus.UnderReview)
            throw new InvalidOperationException("Only a risk assessment under review can be approved");

        ApprovedAt = DateTimeOffset.UtcNow;
        Status = RiskStatus.Approved;

        AddDomainEvent(new RiskAssessmentApprovedEvent(RiskAssessmentId, RiskLevel));
    }

    /// <summary>
    /// FSM Transition: UnderReview → Draft (reviewer sends it back for rework).
    /// </summary>
    public void ReturnToDraft()
    {
        if (Status != RiskStatus.UnderReview)
            throw new InvalidOperationException("Only a risk assessment under review can be returned to draft");

        SubmittedAt = null;
        Status = RiskStatus.Draft;

        AddDomainEvent(new RiskAssessmentReturnedToDraftEvent(RiskAssessmentId));
    }

    /// <summary>
    /// FSM Transition: Approved → Archived (risk mitigated or no longer relevant).
    /// </summary>
    public void Archive()
    {
        if (Status != RiskStatus.Approved)
            throw new InvalidOperationException("Only an approved risk assessment can be archived");

        ArchivedAt = DateTimeOffset.UtcNow;
        Status = RiskStatus.Archived;

        AddDomainEvent(new RiskAssessmentArchivedEvent(RiskAssessmentId));
    }

    /// <summary>
    /// Add a risk control/mitigation measure. Guard: not allowed once archived.
    /// Returns the created control so the caller can link a corrective action
    /// (unified CAPA) to it.
    /// </summary>
    public RiskControl AddControl(string controlMeasure, string responsiblePerson)
    {
        if (Status == RiskStatus.Archived)
            throw new InvalidOperationException("Cannot add controls to an archived risk assessment");

        var control = new RiskControl(RiskAssessmentId, controlMeasure, responsiblePerson);
        _controls.Add(control);

        AddDomainEvent(new RiskControlAddedEvent(RiskAssessmentId, control.RiskControlId));

        return control;
    }

    /// <summary>
    /// Link a corrective action (unified CAPA, Source = RiskAssessment) to one
    /// of the assessment's controls. Guard: the control must exist and be unlinked.
    /// </summary>
    public void LinkControlCorrectiveAction(Guid riskControlId, Guid correctiveActionId)
    {
        var control = _controls.FirstOrDefault(c => c.RiskControlId == riskControlId)
            ?? throw new InvalidOperationException($"Risk control {riskControlId} not found on this risk assessment");

        control.LinkCorrectiveAction(correctiveActionId);
    }

    /// <summary>
    /// Shared validation + score/band computation for Create and UpdateDetails.
    /// </summary>
    private void SetDetails(
        string hazardDescription,
        Severity severity,
        Likelihood likelihood,
        DateTimeOffset reviewDueDate,
        RiskBandConfiguration bands,
        Guid? locationId)
    {
        if (string.IsNullOrWhiteSpace(hazardDescription))
            throw new ArgumentException("HazardDescription is required", nameof(hazardDescription));

        if (!Enum.IsDefined(severity))
            throw new ArgumentException("Severity must be within the 1-5 scale", nameof(severity));

        if (!Enum.IsDefined(likelihood))
            throw new ArgumentException("Likelihood must be within the 1-5 scale", nameof(likelihood));

        if (reviewDueDate < DateTimeOffset.UtcNow)
            throw new ArgumentException("ReviewDueDate cannot be in the past", nameof(reviewDueDate));

        ArgumentNullException.ThrowIfNull(bands);

        if (locationId == Guid.Empty)
            throw new ArgumentException("LocationId must be a valid id or null", nameof(locationId));

        HazardDescription = hazardDescription;
        Severity = severity;
        Likelihood = likelihood;
        ReviewDueDate = reviewDueDate;
        LocationId = locationId;
        RiskScore = (int)severity * (int)likelihood;  // 5×5 matrix: 1-25
        RiskLevel = bands.LevelFor(RiskScore);
    }
}
