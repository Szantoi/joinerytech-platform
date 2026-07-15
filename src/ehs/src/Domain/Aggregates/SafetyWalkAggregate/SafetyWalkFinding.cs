using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;

/// <summary>
/// Finding recorded during a safety walk (0-n per SafetyWalk).
/// Owned entity — cannot exist independently.
/// A finding with RequiresAction=true can be linked to a corrective action
/// (unified CAPA — the same mechanism incidents use).
/// </summary>
public class SafetyWalkFinding
{
    public Guid FindingId { get; private set; }
    public Guid SafetyWalkId { get; private set; }  // FK to parent SafetyWalk
    public string Description { get; private set; } = string.Empty;

    /// <summary>Reuses the module-wide Severity enum (ISO 45001, 1-5)</summary>
    public Severity Severity { get; private set; }

    /// <summary>S3 key of an evidence photo (mobile intake integration)</summary>
    public string? PhotoS3Key { get; private set; }

    public bool RequiresAction { get; private set; }

    /// <summary>Linked corrective action (unified CAPA), set after CAPA creation</summary>
    public Guid? CorrectiveActionId { get; private set; }

    /// <summary>Optional link to an existing risk assessment</summary>
    public Guid? LinkedRiskAssessmentId { get; private set; }

    public DateTimeOffset RecordedAt { get; private set; }

    private SafetyWalkFinding() { }  // EF Core

    internal SafetyWalkFinding(
        Guid safetyWalkId,
        string description,
        Severity severity,
        bool requiresAction,
        string? photoS3Key,
        Guid? linkedRiskAssessmentId)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Description is required", nameof(description));

        FindingId = Guid.NewGuid();
        SafetyWalkId = safetyWalkId;
        Description = description;
        Severity = severity;
        RequiresAction = requiresAction;
        PhotoS3Key = photoS3Key;
        LinkedRiskAssessmentId = linkedRiskAssessmentId;
        RecordedAt = DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Link the finding to its corrective action (unified CAPA).
    /// Guards: the finding must require action and must not be linked yet.
    /// </summary>
    internal void LinkCorrectiveAction(Guid correctiveActionId)
    {
        if (!RequiresAction)
            throw new InvalidOperationException("Cannot link a corrective action to a finding that requires no action");

        if (CorrectiveActionId.HasValue)
            throw new InvalidOperationException("Finding is already linked to a corrective action");

        if (correctiveActionId == Guid.Empty)
            throw new ArgumentException("CorrectiveActionId is required", nameof(correctiveActionId));

        CorrectiveActionId = correctiveActionId;
    }
}
