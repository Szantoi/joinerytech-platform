using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;

/// <summary>
/// Safety walk aggregate root — munkavédelmi bejárás.
/// FSM (UI plan: utemezett → folyamatban → intezkedes → lezart, +elmaradt):
///
///   Scheduled → InProgress → ActionRequired → Closed
///       ↓             ↘ (no action-requiring findings) → Closed
///   Cancelled
///
/// Findings are recorded during the walk; findings with RequiresAction=true
/// spawn corrective actions (unified CAPA — same mechanism as incidents).
/// All transitions are guarded — illegal transitions throw InvalidOperationException.
/// </summary>
public class SafetyWalk : AggregateRoot
{
    private readonly List<SafetyWalkFinding> _findings = new();

    public Guid SafetyWalkId { get; private set; }
    public Guid TenantId { get; private set; }

    /// <summary>Inspected location — FK to EhsLocation</summary>
    public Guid LocationId { get; private set; }

    public DateTimeOffset ScheduledDate { get; private set; }
    public Guid ConductedBy { get; private set; }

    /// <summary>Additional participants (employee ids)</summary>
    public List<Guid> Participants { get; private set; } = new();

    public SafetyWalkStatus Status { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset? ClosedAt { get; private set; }
    public DateTimeOffset? CancelledAt { get; private set; }

    // Navigation
    public IReadOnlyList<SafetyWalkFinding> Findings => _findings.AsReadOnly();

    private SafetyWalk() { }  // EF Core

    /// <summary>
    /// FSM entry: schedule a safety walk (Scheduled status).
    /// </summary>
    public static SafetyWalk Schedule(
        Guid tenantId,
        Guid locationId,
        DateTimeOffset scheduledDate,
        Guid conductedBy,
        List<Guid>? participants = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (locationId == Guid.Empty)
            throw new ArgumentException("LocationId is required", nameof(locationId));

        if (conductedBy == Guid.Empty)
            throw new ArgumentException("ConductedBy is required", nameof(conductedBy));

        var walk = new SafetyWalk
        {
            SafetyWalkId = Guid.NewGuid(),
            TenantId = tenantId,
            LocationId = locationId,
            ScheduledDate = scheduledDate,
            ConductedBy = conductedBy,
            Participants = participants ?? new List<Guid>(),
            Status = SafetyWalkStatus.Scheduled
        };

        walk.AddDomainEvent(new SafetyWalkScheduledEvent(
            walk.SafetyWalkId,
            walk.LocationId,
            walk.ScheduledDate));

        return walk;
    }

    /// <summary>
    /// FSM Transition: Scheduled → InProgress (the walk begins on site).
    /// </summary>
    public void Start()
    {
        if (Status != SafetyWalkStatus.Scheduled)
            throw new InvalidOperationException("Can only start a scheduled safety walk");

        StartedAt = DateTimeOffset.UtcNow;
        Status = SafetyWalkStatus.InProgress;

        AddDomainEvent(new SafetyWalkStartedEvent(SafetyWalkId));
    }

    /// <summary>
    /// Record a finding during the walk.
    /// Guard: findings can only be recorded while the walk is InProgress.
    /// Returns the created finding so the caller can link a corrective action to it.
    /// </summary>
    public SafetyWalkFinding AddFinding(
        string description,
        Severity severity,
        bool requiresAction,
        string? photoS3Key = null,
        Guid? linkedRiskAssessmentId = null)
    {
        if (Status != SafetyWalkStatus.InProgress)
            throw new InvalidOperationException("Findings can only be recorded while the safety walk is in progress");

        var finding = new SafetyWalkFinding(
            SafetyWalkId,
            description,
            severity,
            requiresAction,
            photoS3Key,
            linkedRiskAssessmentId);

        _findings.Add(finding);

        AddDomainEvent(new SafetyWalkFindingRecordedEvent(
            SafetyWalkId,
            finding.FindingId,
            severity,
            requiresAction));

        return finding;
    }

    /// <summary>
    /// Link a corrective action (unified CAPA) to one of the walk's findings.
    /// Guard: the finding must exist, require action, and not be linked yet.
    /// </summary>
    public void LinkFindingCorrectiveAction(Guid findingId, Guid correctiveActionId)
    {
        var finding = _findings.FirstOrDefault(f => f.FindingId == findingId)
            ?? throw new InvalidOperationException($"Finding {findingId} not found on this safety walk");

        finding.LinkCorrectiveAction(correctiveActionId);
    }

    /// <summary>
    /// FSM Transition: InProgress → ActionRequired | Closed.
    /// If any finding requires action the walk waits in ActionRequired for
    /// the CAPAs to complete; otherwise it closes immediately.
    /// </summary>
    public void Complete()
    {
        if (Status != SafetyWalkStatus.InProgress)
            throw new InvalidOperationException("Can only complete a safety walk that is in progress");

        CompletedAt = DateTimeOffset.UtcNow;

        if (_findings.Any(f => f.RequiresAction))
        {
            Status = SafetyWalkStatus.ActionRequired;
        }
        else
        {
            Status = SafetyWalkStatus.Closed;
            ClosedAt = CompletedAt;
        }

        AddDomainEvent(new SafetyWalkCompletedEvent(SafetyWalkId, Status));
    }

    /// <summary>
    /// FSM Transition: ActionRequired → Closed.
    /// Guard: all linked corrective actions must be completed. The completeness
    /// check spans the CorrectiveAction aggregate, so the caller verifies it
    /// against the repository and passes the result in.
    /// </summary>
    public void Close(bool allCorrectiveActionsCompleted)
    {
        if (Status != SafetyWalkStatus.ActionRequired)
            throw new InvalidOperationException("Can only close a safety walk awaiting corrective actions");

        if (!allCorrectiveActionsCompleted)
            throw new InvalidOperationException("Cannot close the safety walk while linked corrective actions are open");

        ClosedAt = DateTimeOffset.UtcNow;
        Status = SafetyWalkStatus.Closed;

        AddDomainEvent(new SafetyWalkClosedEvent(SafetyWalkId));
    }

    /// <summary>
    /// FSM Transition: Scheduled → Cancelled (elmaradt).
    /// Guard: only walks that have not started can be cancelled.
    /// </summary>
    public void Cancel()
    {
        if (Status != SafetyWalkStatus.Scheduled)
            throw new InvalidOperationException("Can only cancel a scheduled safety walk");

        CancelledAt = DateTimeOffset.UtcNow;
        Status = SafetyWalkStatus.Cancelled;

        AddDomainEvent(new SafetyWalkCancelledEvent(SafetyWalkId));
    }
}
