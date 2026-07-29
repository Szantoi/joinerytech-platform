namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Versioned B2B agreement terms revision aggregate component (B2B-03).
/// Immutability enforced once offered or accepted.
/// </summary>
public class AgreementTermsRevision
{
    public Guid Id { get; private set; }
    public Guid AgreementId { get; private set; }
    public int RevisionNumber { get; private set; }
    public string ContentJson { get; private set; } = string.Empty;
    public string CanonicalHash { get; private set; } = string.Empty;
    public TermsRevisionStatus Status { get; private set; }
    public DateTimeOffset CreatedAtUtc { get; private set; }
    public Guid CreatedByTenantId { get; private set; }
    public Guid CreatedByUserId { get; private set; }
    public string? DocumentRef { get; private set; }

    private readonly List<AgreementAcceptanceEvidence> _evidences = new();
    public IReadOnlyList<AgreementAcceptanceEvidence> Evidences => _evidences.AsReadOnly();

    private AgreementTermsRevision() { }

    public static AgreementTermsRevision CreateDraft(
        Guid agreementId,
        int revisionNumber,
        string termsContentJson,
        Guid createdByTenantId,
        Guid createdByUserId,
        DateTimeOffset createdAtUtc,
        string? documentRef = null)
    {
        if (agreementId == Guid.Empty)
            throw new ArgumentException("Agreement ID cannot be empty.", nameof(agreementId));

        if (revisionNumber <= 0)
            throw new ArgumentException("Revision number must be positive.", nameof(revisionNumber));

        string canonicalJson = TermsCanonicalizer.CanonicalizeJson(termsContentJson);
        string hash = TermsCanonicalizer.ComputeSha256Hash(canonicalJson);

        return new AgreementTermsRevision
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            RevisionNumber = revisionNumber,
            ContentJson = canonicalJson,
            CanonicalHash = hash,
            Status = TermsRevisionStatus.Draft,
            CreatedAtUtc = createdAtUtc,
            CreatedByTenantId = createdByTenantId,
            CreatedByUserId = createdByUserId,
            DocumentRef = documentRef
        };
    }

    public void Offer()
    {
        if (Status != TermsRevisionStatus.Draft)
            throw new InvalidOperationException($"Cannot offer terms revision in '{Status}' state.");

        Status = TermsRevisionStatus.Offered;
    }

    public AgreementAcceptanceEvidence Accept(
        Guid tenantId,
        Guid userId,
        string userRole,
        string submittedTermsHash,
        string ipAddress,
        string userAgent,
        DateTimeOffset acceptedAtUtc)
    {
        if (Status != TermsRevisionStatus.Offered && Status != TermsRevisionStatus.Draft)
            throw new InvalidOperationException($"Cannot accept terms revision in '{Status}' state.");

        var evidence = AgreementAcceptanceEvidence.Record(
            Id,
            tenantId,
            userId,
            userRole,
            CanonicalHash,
            submittedTermsHash,
            ipAddress,
            userAgent,
            acceptedAtUtc);

        _evidences.Add(evidence);

        // If at least one acceptance evidence exists from host and guest (or required parties), transition to Accepted
        if (_evidences.Count >= 1)
        {
            Status = TermsRevisionStatus.Accepted;
        }

        return evidence;
    }

    public void Supersede()
    {
        Status = TermsRevisionStatus.Superseded;
    }
}
