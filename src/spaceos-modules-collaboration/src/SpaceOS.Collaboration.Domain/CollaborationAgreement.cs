namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Bilateral B2B collaboration agreement aggregate.
/// </summary>
public class CollaborationAgreement
{
    public Guid Id { get; private set; }
    public Guid HostTenantId { get; private set; }
    public Guid GuestTenantId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public AgreementStatus Status { get; private set; }
    public Guid? CurrentTermsRevisionId { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }

    /// <summary>
    /// Increments on every state transition and backs optimistic concurrency (B2B-10 F2/4).
    /// </summary>
    /// <remarks>
    /// The agreement is the aggregate where a lost update is a correctness problem rather than an
    /// inconvenience: the host may cancel while the guest is accepting, and both transitions are
    /// legal from <c>Proposed</c>. Without a token the second write would silently overwrite the
    /// first and the losing party would be told its action succeeded. Mapped as an EF concurrency
    /// token, so the second writer gets <c>DbUpdateConcurrencyException</c> instead.
    /// </remarks>
    public int RowVersion { get; private set; }

    /// <summary>What proves the guest accepted; never empty once Accepted.</summary>
    public string? AcceptanceEvidence { get; private set; }

    private readonly List<CollaborationParticipantGrant> _grants = new();
    public IReadOnlyList<CollaborationParticipantGrant> Grants => _grants.AsReadOnly();

    private readonly List<AgreementStateHistoryEntry> _history = new();

    /// <summary>Every state change with its actor — the answer to "who agreed to what, when".</summary>
    public IReadOnlyList<AgreementStateHistoryEntry> History => _history.AsReadOnly();

    private CollaborationAgreement() { }

    public static CollaborationAgreement Create(
        Guid hostTenantId,
        Guid guestTenantId,
        string title,
        DateTimeOffset createdAtUtc)
    {
        if (hostTenantId == Guid.Empty || guestTenantId == Guid.Empty)
            throw new ArgumentException("Tenant IDs cannot be empty.");

        if (hostTenantId == guestTenantId)
            throw new InvalidOperationException("Host and guest tenant cannot be the same.");

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException("Title cannot be empty.", nameof(title));

        return new CollaborationAgreement
        {
            Id = Guid.NewGuid(),
            HostTenantId = hostTenantId,
            GuestTenantId = guestTenantId,
            Title = title.Trim(),
            Status = AgreementStatus.Draft,
            CreatedAtUtc = createdAtUtc,
            RowVersion = 1
        };
    }

    public CollaborationParticipantGrant AddGrant(
        string capabilityScope,
        Guid termsRevisionId,
        DateTimeOffset grantedAtUtc,
        DateTimeOffset? expiresAtUtc = null)
    {
        var grant = CollaborationParticipantGrant.Issue(
            Id,
            HostTenantId,
            GuestTenantId,
            capabilityScope,
            termsRevisionId,
            grantedAtUtc,
            expiresAtUtc);

        _grants.Add(grant);
        return grant;
    }

    /// <summary>
    /// Creates a new work package under this agreement — the production birth of delegated work
    /// (B2B-10 F5/1).
    /// </summary>
    /// <remarks>
    /// <para>
    /// A factory on the agreement rather than a bare <see cref="DelegatedWorkPackage.Create"/>
    /// call, because every rule of the birth lives on facts this aggregate holds: WHO may delegate
    /// (the host — letting the guest create packages would let an outside tenant write obligations
    /// into the host's delegation, the same direction rule as <see cref="Propose"/>), between WHOM
    /// (the pair comes from here, so a caller cannot invent a third tenant), and WHETHER there is
    /// still an agreement to delegate under.
    /// </para>
    /// <para>
    /// <b>Creation is allowed while the agreement is in play</b> (Draft, Proposed, Accepted): the
    /// host stages draft packages alongside the proposal it is preparing. A closed agreement
    /// (Rejected, Cancelled, Superseded) takes no new work — "the closed state is closed"
    /// (Gábor's decision, 2026-07-30) applies to what the agreement carries too.
    /// </para>
    /// <para>
    /// <paramref name="existingDelegatedProjectId"/> is the one fact this aggregate cannot know:
    /// which project the agreement's other packages already serve. The caller that can query them
    /// hands it in; the RULE (one agreement plans one project) stays in
    /// <see cref="DelegatedWorkPackage.EnsureSameProject"/>.
    /// </para>
    /// </remarks>
    /// <exception cref="ArgumentNullException">No work scope — a new package must carry its anchor.</exception>
    /// <exception cref="InvalidOperationException">
    /// The actor is not the host, the agreement is closed, or the scope names a different project
    /// than the agreement already delegates.
    /// </exception>
    public DelegatedWorkPackage DelegateWork(
        Guid actorTenantId,
        Guid actorUserId,
        string title,
        string scopeDescription,
        DateTimeOffset dueAtUtc,
        CollaborationWorkScope workScope,
        Guid? existingDelegatedProjectId,
        DateTimeOffset timestampUtc)
    {
        if (actorUserId == Guid.Empty)
            throw new ArgumentException("Delegating work must name the acting user.", nameof(actorUserId));

        ArgumentNullException.ThrowIfNull(workScope);

        EnsureActorIsHost(actorTenantId);

        if (Status is AgreementStatus.Rejected or AgreementStatus.Cancelled or AgreementStatus.Superseded)
            throw new InvalidOperationException(
                $"Cannot delegate new work under an agreement in {Status}: it is closed.");

        DelegatedWorkPackage.EnsureSameProject(existingDelegatedProjectId, workScope);

        return DelegatedWorkPackage.Create(
            Id, HostTenantId, GuestTenantId, title, scopeDescription, dueAtUtc, timestampUtc, workScope);
    }

    /// <summary>
    /// Every grant issued for <paramref name="capability"/>, whatever its state (B2B-10 F3).
    /// </summary>
    /// <remarks>
    /// Returns the revoked and expired ones too, because the caller needs them to say WHY access
    /// was refused: "never granted" and "granted and then withdrawn" are different facts, and only
    /// the log that distinguishes them can answer the question the host will ask.
    /// </remarks>
    public IReadOnlyList<CollaborationParticipantGrant> GrantsFor(string capability)
        => _grants.Where(grant => grant.Covers(capability)).ToList();

    /// <summary>
    /// True when the guest may exercise <paramref name="capability"/> at <paramref name="atUtc"/>.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The rule of what makes a grant usable stays in <see cref="CollaborationParticipantGrant.IsActive"/>;
    /// this is only the aggregate's way of answering for the whole set, so that no caller has to
    /// iterate grants itself and invent a second definition of "active" on the way.
    /// </para>
    /// <para>
    /// ⚠ <b>This does not check WHO the grant was issued to, and it is safe today only because the
    /// agreement is bilateral</b> (root review, F3/1): <see cref="AddGrant"/> takes the host/guest
    /// pair from this aggregate, and <see cref="CollaborationParticipantGrant.Issue"/> forbids a
    /// self-grant, so the only possible recipient IS the guest asking. A future multi-party
    /// agreement (3+ sides) would open that silently — a grant issued to a third participant would
    /// satisfy this check for a different one. Add the recipient comparison BEFORE adding a third
    /// party, not after.
    /// </para>
    /// </remarks>
    public bool HasActiveGrantFor(string capability, DateTimeOffset atUtc)
        => _grants.Any(grant => grant.Covers(capability) && grant.IsActive(atUtc));

    // ---------------------------------------------------------------------------------------
    // Lifecycle (B2B-10 F1). Until this existed the status was set to Draft by the factory and
    // never moved again: an "agreement" that could not be agreed to.
    //
    // Direction of the matrix (F0/3): the HOST proposes, the GUEST answers. The host owns the
    // work being delegated, so it is the one making an offer; letting the guest propose would
    // let an outside tenant create obligations for the host.
    // ---------------------------------------------------------------------------------------

    /// <summary>Puts a drafted agreement in front of the guest.</summary>
    /// <exception cref="InvalidOperationException">Not a draft, or the actor is not the host.</exception>
    public void Propose(Guid actorTenantId, Guid actorUserId, DateTimeOffset timestampUtc)
    {
        EnsureActorIsHost(actorTenantId);
        EnsureStatusIs(AgreementStatus.Draft, "Propose");

        TransitionTo(AgreementStatus.Proposed, actorTenantId, actorUserId, "Propose", null, null, timestampUtc);
    }

    /// <summary>
    /// Records the guest's acceptance, binding the terms revision it accepted.
    /// </summary>
    /// <remarks>
    /// <para>
    /// <b>Two-sided by construction.</b> The host already stated its side by proposing; this is
    /// the guest's, and it cannot be recorded without naming WHAT was accepted
    /// (<paramref name="termsRevisionId"/>) and WHAT PROVES it
    /// (<paramref name="acceptanceEvidence"/>). The B2B-03 shortcoming was exactly this: the
    /// status could be flipped to Accepted from one side with nothing behind it, and an
    /// agreement nobody can evidence is worse than no agreement — it looks binding.
    /// </para>
    /// </remarks>
    /// <exception cref="ArgumentException">The evidence is missing or the revision is empty.</exception>
    /// <exception cref="InvalidOperationException">Not proposed, or the actor is not the guest.</exception>
    public void Accept(
        Guid actorTenantId,
        Guid actorUserId,
        Guid termsRevisionId,
        string acceptanceEvidence,
        DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        EnsureStatusIs(AgreementStatus.Proposed, "Accept");

        if (termsRevisionId == Guid.Empty)
            throw new ArgumentException(
                "Acceptance must name the terms revision it accepts.", nameof(termsRevisionId));

        if (string.IsNullOrWhiteSpace(acceptanceEvidence))
            throw new ArgumentException(
                "Acceptance must carry evidence; an accepted agreement with nothing behind it " +
                "looks binding and is not.", nameof(acceptanceEvidence));

        CurrentTermsRevisionId = termsRevisionId;
        AcceptanceEvidence = acceptanceEvidence.Trim();

        TransitionTo(
            AgreementStatus.Accepted, actorTenantId, actorUserId, "Accept",
            null, termsRevisionId, timestampUtc);
    }

    /// <summary>Records the guest's refusal, with the reason the host will read.</summary>
    /// <exception cref="ArgumentException">No reason was given.</exception>
    /// <exception cref="InvalidOperationException">Not proposed, or the actor is not the guest.</exception>
    public void Reject(Guid actorTenantId, Guid actorUserId, string reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsGuest(actorTenantId);
        EnsureStatusIs(AgreementStatus.Proposed, "Reject");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException(
                "A rejection must say why: the host can only act on a reason.", nameof(reason));

        TransitionTo(
            AgreementStatus.Rejected, actorTenantId, actorUserId, "Reject",
            reason.Trim(), null, timestampUtc);
    }

    /// <summary>Withdraws an agreement the guest has not accepted yet.</summary>
    /// <remarks>
    /// The host may withdraw its own offer, but only while it is still an offer. Cancelling an
    /// ACCEPTED agreement one-sidedly would undo the guest's commitment without their say —
    /// that path is a supersede or a termination, not a cancel.
    /// </remarks>
    /// <exception cref="InvalidOperationException">Already answered, or the actor is not the host.</exception>
    public void Cancel(Guid actorTenantId, Guid actorUserId, string? reason, DateTimeOffset timestampUtc)
    {
        EnsureActorIsHost(actorTenantId);

        if (Status is not (AgreementStatus.Draft or AgreementStatus.Proposed))
            throw new InvalidOperationException(
                $"Cannot cancel an agreement in {Status}: only a draft or an unanswered proposal " +
                "may be withdrawn one-sidedly.");

        TransitionTo(
            AgreementStatus.Cancelled, actorTenantId, actorUserId, "Cancel",
            string.IsNullOrWhiteSpace(reason) ? null : reason.Trim(), null, timestampUtc);
    }

    /// <summary>Replaces the accepted terms with a newer revision.</summary>
    /// <remarks>
    /// Supersede closes THIS agreement's life: the successor revision is a new agreement to be
    /// proposed and accepted on its own. Rewriting the terms in place would leave the guest
    /// bound to something they never saw.
    /// </remarks>
    /// <exception cref="ArgumentException">The successor revision is empty or unchanged.</exception>
    /// <exception cref="InvalidOperationException">Not accepted, or the actor is not the host.</exception>
    public void Supersede(
        Guid actorTenantId,
        Guid actorUserId,
        Guid supersedingTermsRevisionId,
        DateTimeOffset timestampUtc)
    {
        EnsureActorIsHost(actorTenantId);
        EnsureStatusIs(AgreementStatus.Accepted, "Supersede");

        if (supersedingTermsRevisionId == Guid.Empty)
            throw new ArgumentException(
                "Superseding must name the revision that replaces the current terms.",
                nameof(supersedingTermsRevisionId));

        if (supersedingTermsRevisionId == CurrentTermsRevisionId)
            throw new ArgumentException(
                "The superseding revision is the one already in force; nothing would change.",
                nameof(supersedingTermsRevisionId));

        TransitionTo(
            AgreementStatus.Superseded, actorTenantId, actorUserId, "Supersede",
            null, supersedingTermsRevisionId, timestampUtc);
    }

    /// <summary>
    /// Which transitions <paramref name="actorTenantId"/> could make on this agreement (F3/4).
    /// </summary>
    /// <remarks>
    /// The counterpart of the work package's list, and kept honest the same way: a parity test
    /// drives every transition from every state through the real methods and compares. The guards
    /// below remain the enforcing side, because each explains its own refusal.
    /// </remarks>
    public IReadOnlyList<string> AllowedActionsFor(Guid actorTenantId)
    {
        if (actorTenantId != HostTenantId && actorTenantId != GuestTenantId)
        {
            return [];
        }

        var isHost = actorTenantId == HostTenantId;
        var isGuest = actorTenantId == GuestTenantId;
        var actions = new List<string>();

        if (isHost && Status == AgreementStatus.Draft)
            actions.Add("Propose");

        if (isGuest && Status == AgreementStatus.Proposed)
        {
            actions.Add("Accept");
            actions.Add("Reject");
        }

        if (isHost && Status is AgreementStatus.Draft or AgreementStatus.Proposed)
            actions.Add("Cancel");

        if (isHost && Status == AgreementStatus.Accepted)
            actions.Add("Supersede");

        return actions;
    }

    /// <summary>When this agreement last moved — its own creation if it never has.</summary>
    /// <remarks>
    /// Read from the recorded history rather than kept as a field: a stored "last modified" is a
    /// second truth that only stays right as long as everyone remembers to update it.
    /// </remarks>
    public DateTimeOffset LastChangedAtUtc =>
        _history.Count == 0 ? CreatedAtUtc : _history[^1].TimestampUtc;

    private void EnsureActorIsHost(Guid actorTenantId)
    {
        if (actorTenantId != HostTenantId)
            throw new InvalidOperationException(
                "Only the host tenant may perform this transition on the agreement.");
    }

    private void EnsureActorIsGuest(Guid actorTenantId)
    {
        if (actorTenantId != GuestTenantId)
            throw new InvalidOperationException(
                "Only the guest tenant may perform this transition on the agreement.");
    }

    private void EnsureStatusIs(AgreementStatus expected, string actionName)
    {
        if (Status != expected)
            throw new InvalidOperationException(
                $"Cannot {actionName} an agreement in {Status}; it must be {expected}.");
    }

    private void TransitionTo(
        AgreementStatus newStatus,
        Guid actorTenantId,
        Guid actorUserId,
        string actionName,
        string? reason,
        Guid? termsRevisionId,
        DateTimeOffset timestampUtc)
    {
        _history.Add(AgreementStateHistoryEntry.Record(
            Id, Status, newStatus, actorTenantId, actorUserId, actionName, reason,
            termsRevisionId, timestampUtc));

        Status = newStatus;

        // Every transition goes through here, so this is the one place the version can be kept
        // honest — an increment placed in each public method would eventually miss one.
        RowVersion++;
    }
}
