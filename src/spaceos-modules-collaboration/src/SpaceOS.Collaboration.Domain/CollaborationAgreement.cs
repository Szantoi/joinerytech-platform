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
            CreatedAtUtc = createdAtUtc
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
    }
}
