namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Delegated Work Package aggregate root for B2B task execution (B2B-04).
/// Manages host/guest capability policies, FSM state transitions, and proof requirements.
/// </summary>
public class DelegatedWorkPackage
{
    public Guid Id { get; private set; }
    public Guid AgreementId { get; private set; }
    public Guid HostTenantId { get; private set; }
    public Guid GuestTenantId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ScopeDescription { get; private set; } = string.Empty;
    public WorkPackageStatus Status { get; private set; }
    public DateTimeOffset DueAtUtc { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public int RowVersion { get; private set; }
    public string? DeliverableRef { get; private set; }
    public string? CompletionProofRef { get; private set; }
    public string? RejectionOrChangeReason { get; private set; }

    /// <summary>
    /// Which Kernel work this package serves (B2B-10 F1, F0/4 decision).
    /// </summary>
    /// <remarks>
    /// Nullable only because packages created before this field existed have no anchor to fill
    /// in. New packages always carry one — <see cref="Create"/> demands it.
    /// </remarks>
    public CollaborationWorkScope? WorkScope { get; private set; }

    /// <summary>
    /// The states a package never leaves — one place, so "closed" cannot mean two things.
    /// </summary>
    /// <remarks>
    /// Read by the cancel guard and by <see cref="AllowedActionsFor"/>; the parity test drives the
    /// real methods and compares, so the two cannot drift apart unnoticed.
    /// </remarks>
    public bool IsClosed => ClosedStatuses.Contains(Status);

    /// <summary>
    /// The closed states as data, so a database query can ask the same question.
    /// </summary>
    /// <remarks>
    /// <see cref="IsClosed"/> is a computed property and no SQL provider can translate it; a read
    /// model counting "open packages" would otherwise have to spell the list out again in a
    /// <c>Where</c>, and that copy is what drifts.
    /// </remarks>
    public static readonly IReadOnlyList<WorkPackageStatus> ClosedStatuses =
    [
        WorkPackageStatus.Completed,
        WorkPackageStatus.Rejected,
        WorkPackageStatus.Cancelled
    ];

    private readonly List<WorkPackageStateHistoryEntry> _history = new();
    public IReadOnlyList<WorkPackageStateHistoryEntry> History => _history.AsReadOnly();

    private DelegatedWorkPackage() { }

    /// <summary>
    /// Guards the "one agreement plans one project" invariant across packages.
    /// </summary>
    /// <remarks>
    /// The analogue of scheduling's one-run-one-project rule. Packages are separate aggregates,
    /// so the check needs the sibling's project handed in — the caller that loads them is the
    /// only one who can. Keeping the RULE here (rather than writing an `if` in a handler) means
    /// there is still one place that says what it means.
    /// </remarks>
    /// <exception cref="InvalidOperationException">The scope belongs to a different project.</exception>
    public static void EnsureSameProject(Guid? existingProjectId, CollaborationWorkScope scope)
    {
        ArgumentNullException.ThrowIfNull(scope);

        if (existingProjectId is { } project && project != scope.ProjectId)
            throw new InvalidOperationException(
                $"This agreement already delegates work of project {project}; a package scoped to " +
                $"{scope.ProjectId} would make one agreement span two projects.");
    }

    public static DelegatedWorkPackage Create(
        Guid agreementId,
        Guid hostTenantId,
        Guid guestTenantId,
        string title,
        string scopeDescription,
        DateTimeOffset dueAtUtc,
        DateTimeOffset createdAtUtc,
        CollaborationWorkScope? workScope = null)
    {
        if (agreementId == Guid.Empty)
            throw new ArgumentException("Agreement ID cannot be empty.", nameof(agreementId));

        if (hostTenantId == Guid.Empty || guestTenantId == Guid.Empty)
            throw new ArgumentException("Tenant IDs cannot be empty.");

        if (hostTenantId == guestTenantId)
            throw new InvalidOperationException("Host and guest tenant cannot be the same (no self-delegation).");

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be empty.", nameof(title));

        if (dueAtUtc <= createdAtUtc)
            throw new ArgumentException("Due date must be in the future relative to creation time.", nameof(dueAtUtc));

        return new DelegatedWorkPackage
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            HostTenantId = hostTenantId,
            GuestTenantId = guestTenantId,
            Title = title.Trim(),
            ScopeDescription = scopeDescription?.Trim() ?? string.Empty,
            Status = WorkPackageStatus.Draft,
            DueAtUtc = dueAtUtc,
            CreatedAtUtc = createdAtUtc,
            // Isolated copy: EF maps an owned value object by IDENTITY, so two packages sharing
            // one instance would silently write NULL columns for the second (see the owned
            // value-object trap). A record copy keeps equality intact and the storage honest.
            WorkScope = workScope is null ? null : workScope with { },
            RowVersion = 1
        };
    }

    public void Offer(Guid actorTenantId, Guid actorUserId, DateTimeOffset timestampUtc)
    {
        EnsureActorIsParty(actorTenantId);
        EnsureStatus(WorkPackageStatus.Draft);

        TransitionTo(WorkPackageStatus.Offered, actorTenantId, actorUserId, "Offer", null, timestampUtc);
    }

    public void Accept(Guid actorTenantId, Guid actorUserId, DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        EnsureStatus(WorkPackageStatus.Offered);

        TransitionTo(WorkPackageStatus.Accepted, actorTenantId, actorUserId, "Accept", null, timestampUtc);
    }

    public void Reject(Guid actorTenantId, Guid actorUserId, string reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        EnsureStatus(WorkPackageStatus.Offered);

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Rejection reason is required.", nameof(reason));

        RejectionOrChangeReason = reason.Trim();
        TransitionTo(WorkPackageStatus.Rejected, actorTenantId, actorUserId, "Reject", reason, timestampUtc);
    }

    public void StartProgress(Guid actorTenantId, Guid actorUserId, DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        if (Status != WorkPackageStatus.Accepted && Status != WorkPackageStatus.ChangesRequested)
            throw new InvalidOperationException($"Cannot start progress from '{Status}' state.");

        TransitionTo(WorkPackageStatus.InProgress, actorTenantId, actorUserId, "StartProgress", null, timestampUtc);
    }

    public void Submit(Guid actorTenantId, Guid actorUserId, string deliverableRef, DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        EnsureStatus(WorkPackageStatus.InProgress);

        if (string.IsNullOrWhiteSpace(deliverableRef))
            throw new ArgumentException("Deliverable proof reference (QA/DMS) is required for submission.", nameof(deliverableRef));

        DeliverableRef = deliverableRef.Trim();
        TransitionTo(WorkPackageStatus.Submitted, actorTenantId, actorUserId, "Submit", null, timestampUtc);
    }

    public void RequestChanges(Guid actorTenantId, Guid actorUserId, string reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsHost(actorTenantId);
        EnsureStatus(WorkPackageStatus.Submitted);

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Change request reason is required.", nameof(reason));

        RejectionOrChangeReason = reason.Trim();
        TransitionTo(WorkPackageStatus.ChangesRequested, actorTenantId, actorUserId, "RequestChanges", reason, timestampUtc);
    }

    public void Complete(Guid actorTenantId, Guid actorUserId, string completionProofRef, DateTimeOffset timestampUtc)
    {
        EnsureActorIsHost(actorTenantId);
        EnsureStatus(WorkPackageStatus.Submitted);

        if (string.IsNullOrWhiteSpace(completionProofRef))
            throw new ArgumentException("Completion proof reference is required.", nameof(completionProofRef));

        CompletionProofRef = completionProofRef.Trim();
        TransitionTo(WorkPackageStatus.Completed, actorTenantId, actorUserId, "Complete", null, timestampUtc);
    }

    /// <summary>Withdraws a package that is still in play; either party may.</summary>
    /// <remarks>
    /// <b>A closed package stays closed</b> (Gábor's decision, 2026-07-30). Until F3/4 the only
    /// refusal here was <c>Completed</c>, so an already rejected or cancelled package could be
    /// cancelled again: the audit trail would gain a second entry about the same fact, and
    /// cancelling a REJECTED package would overwrite the guest's stated reason with the host's —
    /// between two companies that is not a detail.
    /// </remarks>
    public void Cancel(Guid actorTenantId, Guid actorUserId, string reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsParty(actorTenantId);
        if (IsClosed)
            throw new InvalidOperationException(
                $"Cannot cancel a work package in {Status}: it is already closed.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Cancellation reason is required.", nameof(reason));

        RejectionOrChangeReason = reason.Trim();
        TransitionTo(WorkPackageStatus.Cancelled, actorTenantId, actorUserId, "Cancel", reason, timestampUtc);
    }

    /// <summary>
    /// Which transitions <paramref name="actorTenantId"/> could make right now (B2B-10 F3/4).
    /// </summary>
    /// <remarks>
    /// <para>
    /// This moved into the aggregate from a projection table that had drifted from it. The table
    /// withheld <c>Cancel</c> from the guest in <c>Draft</c> — an action the domain allows — so the
    /// portal built from it would have hidden a legal move; and it listed actions per state in a
    /// switch that nothing compared against the guards below.
    /// </para>
    /// <para>
    /// <b>The guards are still the enforcing side.</b> They stay as they are, because each one
    /// explains its own refusal ("only the guest…", "required state Offered…") and a single
    /// boolean could not. That leaves two statements of the same rule, so the parity test drives
    /// every action in every state through the REAL methods and compares the outcome with this
    /// list, cell by cell. The list is advice; the guards decide; the test keeps them equal.
    /// </para>
    /// </remarks>
    public IReadOnlyList<string> AllowedActionsFor(Guid actorTenantId)
    {
        if (actorTenantId != HostTenantId && actorTenantId != GuestTenantId)
        {
            // Not a party: no actions, and the projection turns the whole package into a 404
            // before this list is ever read.
            return [];
        }

        var isHost = actorTenantId == HostTenantId;
        var isGuest = actorTenantId == GuestTenantId;
        var actions = new List<string>();

        if (Status == WorkPackageStatus.Draft)
            actions.Add("Offer");

        if (isGuest && Status == WorkPackageStatus.Offered)
        {
            actions.Add("Accept");
            actions.Add("Reject");
        }

        if (isGuest && Status is WorkPackageStatus.Accepted or WorkPackageStatus.ChangesRequested)
            actions.Add("StartProgress");

        if (isGuest && Status == WorkPackageStatus.InProgress)
            actions.Add("Submit");

        if (isHost && Status == WorkPackageStatus.Submitted)
        {
            actions.Add("RequestChanges");
            actions.Add("Complete");
        }

        // Either party, as long as the package is still in play.
        if (!IsClosed)
            actions.Add("Cancel");

        return actions;
    }

    private void EnsureActorIsParty(Guid actorTenantId)
    {
        if (actorTenantId != HostTenantId && actorTenantId != GuestTenantId)
            throw new InvalidOperationException("Actor tenant is not a party to this work package.");
    }

    private void EnsureActorIsGuest(Guid actorTenantId)
    {
        if (actorTenantId != GuestTenantId)
            throw new InvalidOperationException("Only the guest (performing) tenant can execute this action.");
    }

    private void EnsureActorIsHost(Guid actorTenantId)
    {
        if (actorTenantId != HostTenantId)
            throw new InvalidOperationException("Only the host (requesting) tenant can execute this action.");
    }

    private void EnsureStatus(WorkPackageStatus requiredStatus)
    {
        if (Status != requiredStatus)
            throw new InvalidOperationException($"Invalid state transition. Required state '{requiredStatus}', current state '{Status}'.");
    }

    private void TransitionTo(WorkPackageStatus newStatus, Guid actorTenantId, Guid actorUserId, string actionName, string? reason, DateTimeOffset timestampUtc)
    {
        var entry = WorkPackageStateHistoryEntry.Record(
            Id,
            Status,
            newStatus,
            actorTenantId,
            actorUserId,
            actionName,
            reason,
            timestampUtc);

        _history.Add(entry);
        Status = newStatus;
        RowVersion++;
    }
}
