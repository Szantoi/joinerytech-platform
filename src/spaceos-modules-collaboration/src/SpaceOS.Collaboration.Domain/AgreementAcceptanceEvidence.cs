namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Immutable audit record capturing digital acceptance evidence for a terms revision (B2B-03).
/// </summary>
public class AgreementAcceptanceEvidence
{
    public Guid Id { get; private set; }
    public Guid TermsRevisionId { get; private set; }
    public Guid TenantId { get; private set; }
    public Guid UserId { get; private set; }
    public string UserRole { get; private set; } = string.Empty;
    public DateTimeOffset AcceptedAtUtc { get; private set; }
    public string TermsHash { get; private set; } = string.Empty;
    public string IpAddress { get; private set; } = string.Empty;
    public string UserAgent { get; private set; } = string.Empty;

    private AgreementAcceptanceEvidence() { }

    public static AgreementAcceptanceEvidence Record(
        Guid termsRevisionId,
        Guid tenantId,
        Guid userId,
        string userRole,
        string expectedTermsHash,
        string submittedTermsHash,
        string ipAddress,
        string userAgent,
        DateTimeOffset acceptedAtUtc)
    {
        if (termsRevisionId == Guid.Empty || tenantId == Guid.Empty || userId == Guid.Empty)
            throw new ArgumentException("IDs cannot be empty.");

        if (string.IsNullOrWhiteSpace(submittedTermsHash))
            throw new ArgumentException("Submitted terms hash cannot be empty.", nameof(submittedTermsHash));

        if (!string.Equals(expectedTermsHash, submittedTermsHash, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException($"Terms hash mismatch. Expected '{expectedTermsHash}', submitted '{submittedTermsHash}'.");

        return new AgreementAcceptanceEvidence
        {
            Id = Guid.NewGuid(),
            TermsRevisionId = termsRevisionId,
            TenantId = tenantId,
            UserId = userId,
            UserRole = userRole?.Trim() ?? "User",
            AcceptedAtUtc = acceptedAtUtc,
            TermsHash = submittedTermsHash.ToLowerInvariant(),
            IpAddress = ipAddress?.Trim() ?? "127.0.0.1",
            UserAgent = userAgent?.Trim() ?? "Unknown"
        };
    }
}
