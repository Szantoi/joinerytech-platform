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

    public void Cancel(Guid actorTenantId, Guid actorUserId, string reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsParty(actorTenantId);
        if (Status == WorkPackageStatus.Completed)
            throw new InvalidOperationException("Cannot cancel a completed work package.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Cancellation reason is required.", nameof(reason));

        RejectionOrChangeReason = reason.Trim();
        TransitionTo(WorkPackageStatus.Cancelled, actorTenantId, actorUserId, "Cancel", reason, timestampUtc);
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
