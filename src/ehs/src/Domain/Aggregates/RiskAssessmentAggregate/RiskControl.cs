namespace SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;

/// <summary>
/// Risk control/mitigation measure (0-n per RiskAssessment)
/// Owned entity - cannot exist independently
/// </summary>
public class RiskControl
{
    public Guid RiskControlId { get; private set; }
    public Guid RiskAssessmentId { get; private set; }  // FK to parent RiskAssessment
    public string ControlMeasure { get; private set; } = string.Empty;
    public string ResponsiblePerson { get; private set; } = string.Empty;
    public DateTimeOffset ImplementedAt { get; private set; }
    public DateTimeOffset? VerifiedAt { get; private set; }
    public bool IsVerified => VerifiedAt.HasValue;

    /// <summary>Linked corrective action (unified CAPA, Source = RiskAssessment), set after CAPA creation</summary>
    public Guid? CorrectiveActionId { get; private set; }

    private RiskControl() { }  // EF Core

    internal RiskControl(
        Guid riskAssessmentId,
        string controlMeasure,
        string responsiblePerson)
    {
        if (riskAssessmentId == Guid.Empty)
            throw new ArgumentException("RiskAssessmentId is required", nameof(riskAssessmentId));

        if (string.IsNullOrWhiteSpace(controlMeasure))
            throw new ArgumentException("ControlMeasure is required", nameof(controlMeasure));

        if (string.IsNullOrWhiteSpace(responsiblePerson))
            throw new ArgumentException("ResponsiblePerson is required", nameof(responsiblePerson));

        RiskControlId = Guid.NewGuid();
        RiskAssessmentId = riskAssessmentId;
        ControlMeasure = controlMeasure;
        ResponsiblePerson = responsiblePerson;
        ImplementedAt = DateTimeOffset.UtcNow;
    }

    internal void MarkVerified()
    {
        if (IsVerified)
            throw new InvalidOperationException("Control measure already verified");

        VerifiedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Link the control to its corrective action (unified CAPA).
    /// Guards: must not be linked yet; the CAPA id must be valid.
    /// </summary>
    internal void LinkCorrectiveAction(Guid correctiveActionId)
    {
        if (CorrectiveActionId.HasValue)
            throw new InvalidOperationException("Risk control is already linked to a corrective action");

        if (correctiveActionId == Guid.Empty)
            throw new ArgumentException("CorrectiveActionId is required", nameof(correctiveActionId));

        CorrectiveActionId = correctiveActionId;
    }
}
