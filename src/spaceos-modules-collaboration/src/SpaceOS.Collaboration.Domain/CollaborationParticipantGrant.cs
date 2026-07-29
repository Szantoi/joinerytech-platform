namespace SpaceOS.Collaboration.Domain;

/// <summary>
/// Represents a explicit B2B capability grant issued from a host tenant to a guest tenant.
/// Used as the security foundation for cross-tenant RLS policies.
/// </summary>
public class CollaborationParticipantGrant
{
    public Guid Id { get; private set; }
    public Guid AgreementId { get; private set; }
    public Guid HostTenantId { get; private set; }
    public Guid GuestTenantId { get; private set; }
    public string CapabilityScope { get; private set; } = string.Empty;
    public Guid TermsRevisionId { get; private set; }
    public ParticipantGrantStatus Status { get; private set; }
    public DateTimeOffset GrantedAtUtc { get; private set; }
    public DateTimeOffset? ExpiresAtUtc { get; private set; }
    public DateTimeOffset? RevokedAtUtc { get; private set; }
    public string? RevocationReason { get; private set; }

    private CollaborationParticipantGrant() { }

    public static CollaborationParticipantGrant Issue(
        Guid agreementId,
        Guid hostTenantId,
        Guid guestTenantId,
        string capabilityScope,
        Guid termsRevisionId,
        DateTimeOffset grantedAtUtc,
        DateTimeOffset? expiresAtUtc = null)
    {
        if (hostTenantId == Guid.Empty)
            throw new ArgumentException("Host tenant ID cannot be empty.", nameof(hostTenantId));

        if (guestTenantId == Guid.Empty)
            throw new ArgumentException("Guest tenant ID cannot be empty.", nameof(guestTenantId));

        if (hostTenantId == guestTenantId)
            throw new InvalidOperationException("Host and guest tenant cannot be the same (no self-grant).");

        if (string.IsNullOrWhiteSpace(capabilityScope))
            throw new ArgumentException("Capability scope cannot be null or empty.", nameof(capabilityScope));

        return new CollaborationParticipantGrant
        {
            Id = Guid.NewGuid(),
            AgreementId = agreementId,
            HostTenantId = hostTenantId,
            GuestTenantId = guestTenantId,
            CapabilityScope = capabilityScope.Trim().ToLowerInvariant(),
            TermsRevisionId = termsRevisionId,
            Status = ParticipantGrantStatus.Active,
            GrantedAtUtc = grantedAtUtc,
            ExpiresAtUtc = expiresAtUtc
        };
    }

    public bool IsActive(DateTimeOffset atUtc)
    {
        if (Status != ParticipantGrantStatus.Active)
            return false;

        if (ExpiresAtUtc.HasValue && ExpiresAtUtc.Value <= atUtc)
            return false;

        return true;
    }

    public void Revoke(string reason, DateTimeOffset revokedAtUtc)
    {
        if (Status == ParticipantGrantStatus.Revoked)
            return;

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Revocation reason is required.", nameof(reason));

        Status = ParticipantGrantStatus.Revoked;
        RevokedAtUtc = revokedAtUtc;
        RevocationReason = reason.Trim();
    }
}
