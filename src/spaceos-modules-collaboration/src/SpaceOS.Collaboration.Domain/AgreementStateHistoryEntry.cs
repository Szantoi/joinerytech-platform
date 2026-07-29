namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// State change audit record for <see cref="CollaborationAgreement"/> (B2B-10 F1).
/// </summary>
/// <remarks>
/// Mirrors <see cref="WorkPackageStateHistoryEntry"/> deliberately: an agreement between two
/// tenants is exactly the place where "who moved this, and when" has to be answerable months
/// later, and answering it the same way in both aggregates means one thing to learn, not two.
/// </remarks>
public class AgreementStateHistoryEntry
{
    public Guid Id { get; private set; }
    public Guid AgreementId { get; private set; }
    public AgreementStatus FromStatus { get; private set; }
    public AgreementStatus ToStatus { get; private set; }
    public Guid ActorTenantId { get; private set; }
    public Guid ActorUserId { get; private set; }
    public string ActionName { get; private set; } = string.Empty;

    /// <summary>Why the actor did it, when the transition demands a reason.</summary>
    public string? Reason { get; private set; }

    /// <summary>Terms revision the transition bound, when it bound one.</summary>
    public Guid? TermsRevisionId { get; private set; }

    public DateTimeOffset TimestampUtc { get; private set; }

    private AgreementStateHistoryEntry() { }

    public static AgreementStateHistoryEntry Record(
        Guid agreementId,
        AgreementStatus fromStatus,
        AgreementStatus toStatus,
        Guid actorTenantId,
        Guid actorUserId,
        string actionName,
        string? reason,
        Guid? termsRevisionId,
        DateTimeOffset timestampUtc)
    {
        if (actorTenantId == Guid.Empty)
            throw new ArgumentException("An actor must belong to a tenant.", nameof(actorTenantId));

        if (actorUserId == Guid.Empty)
            throw new ArgumentException("An actor must be a user.", nameof(actorUserId));

        return new AgreementStateHistoryEntry
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ActorTenantId = actorTenantId,
            ActorUserId = actorUserId,
            ActionName = actionName,
            Reason = reason,
            TermsRevisionId = termsRevisionId,
            TimestampUtc = timestampUtc
        };
    }
}
