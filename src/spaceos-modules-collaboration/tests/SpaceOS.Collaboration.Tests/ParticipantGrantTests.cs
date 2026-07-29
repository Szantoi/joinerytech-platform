using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class ParticipantGrantTests
{
    private static readonly Guid HostTenant = Guid.NewGuid();
    private static readonly Guid GuestTenant = Guid.NewGuid();
    private static readonly Guid AgreementId = Guid.NewGuid();
    private static readonly Guid TermsRevisionId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Fact]
    public void Issue_ValidArgs_CreatesActiveGrant()
    {
        var grant = CollaborationParticipantGrant.Issue(
            AgreementId,
            HostTenant,
            GuestTenant,
            "subcontract.execute",
            TermsRevisionId,
            Now);

        Assert.NotEqual(Guid.Empty, grant.Id);
        Assert.Equal(HostTenant, grant.HostTenantId);
        Assert.Equal(GuestTenant, grant.GuestTenantId);
        Assert.Equal("subcontract.execute", grant.CapabilityScope);
        Assert.Equal(ParticipantGrantStatus.Active, grant.Status);
        Assert.True(grant.IsActive(Now));
    }

    [Fact]
    public void Issue_SameHostAndGuest_ThrowsInvalidOperationException()
    {
        var sameTenant = Guid.NewGuid();

        var ex = Assert.Throws<InvalidOperationException>(() =>
            CollaborationParticipantGrant.Issue(
                AgreementId,
                sameTenant,
                sameTenant,
                "subcontract.execute",
                TermsRevisionId,
                Now));

        Assert.Contains("no self-grant", ex.Message);
    }

    [Fact]
    public void Issue_NullOrEmptyCapabilityScope_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() =>
            CollaborationParticipantGrant.Issue(
                AgreementId,
                HostTenant,
                GuestTenant,
                "   ",
                TermsRevisionId,
                Now));
    }

    [Fact]
    public void Revoke_ValidReason_ChangesStatusToRevokedAndInactivates()
    {
        var grant = CollaborationParticipantGrant.Issue(
            AgreementId,
            HostTenant,
            GuestTenant,
            "subcontract.execute",
            TermsRevisionId,
            Now);

        var revokeTime = Now.AddHours(1);
        grant.Revoke("Security policy violation", revokeTime);

        Assert.Equal(ParticipantGrantStatus.Revoked, grant.Status);
        Assert.Equal("Security policy violation", grant.RevocationReason);
        Assert.Equal(revokeTime, grant.RevokedAtUtc);
        Assert.False(grant.IsActive(revokeTime));
    }

    [Fact]
    public void IsActive_ExpiredGrant_ReturnsFalse()
    {
        var expiresAt = Now.AddHours(1);
        var grant = CollaborationParticipantGrant.Issue(
            AgreementId,
            HostTenant,
            GuestTenant,
            "subcontract.execute",
            TermsRevisionId,
            Now,
            expiresAtUtc: expiresAt);

        Assert.True(grant.IsActive(Now));
        Assert.False(grant.IsActive(expiresAt.AddSeconds(1)));
    }
}
