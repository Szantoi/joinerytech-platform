using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

public sealed class AgreementTermsEvidenceTests
{
    private static readonly Guid AgreementId = Guid.NewGuid();
    private static readonly Guid TenantId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;
    private const string SampleTerms = """{"scope":"Subcontracting","sla_days":5}""";

    [Fact]
    public void CreateDraft_ValidTerms_ComputesDeterministicHash()
    {
        var revision = AgreementTermsRevision.CreateDraft(
            AgreementId,
            1,
            SampleTerms,
            TenantId,
            UserId,
            Now);

        Assert.Equal(TermsRevisionStatus.Draft, revision.Status);
        Assert.Equal(1, revision.RevisionNumber);
        Assert.False(string.IsNullOrWhiteSpace(revision.CanonicalHash));
        Assert.Equal(64, revision.CanonicalHash.Length);
    }

    [Fact]
    public void Accept_ValidHash_RecordsEvidenceAndTransitionsToAccepted()
    {
        var revision = AgreementTermsRevision.CreateDraft(
            AgreementId,
            1,
            SampleTerms,
            TenantId,
            UserId,
            Now);

        revision.Offer();
        Assert.Equal(TermsRevisionStatus.Offered, revision.Status);

        var evidence = revision.Accept(
            TenantId,
            UserId,
            "TenantAdmin",
            revision.CanonicalHash,
            "192.168.1.50",
            "Mozilla/5.0",
            Now.AddMinutes(5));

        Assert.Equal(TermsRevisionStatus.Accepted, revision.Status);
        Assert.Single(revision.Evidences);
        Assert.Equal(evidence.TermsHash, revision.CanonicalHash);
    }

    [Fact]
    public void Accept_MismatchedTermsHash_ThrowsInvalidOperationException()
    {
        var revision = AgreementTermsRevision.CreateDraft(
            AgreementId,
            1,
            SampleTerms,
            TenantId,
            UserId,
            Now);

        revision.Offer();

        string tamperedHash = "0000000000000000000000000000000000000000000000000000000000000000";

        var ex = Assert.Throws<InvalidOperationException>(() =>
            revision.Accept(
                TenantId,
                UserId,
                "TenantAdmin",
                tamperedHash,
                "192.168.1.50",
                "Mozilla/5.0",
                Now.AddMinutes(5)));

        Assert.Contains("Terms hash mismatch", ex.Message);
    }

    [Fact]
    public void Supersede_AcceptedRevision_ChangesStatusToSuperseded()
    {
        var revision = AgreementTermsRevision.CreateDraft(
            AgreementId,
            1,
            SampleTerms,
            TenantId,
            UserId,
            Now);

        revision.Offer();
        revision.Accept(TenantId, UserId, "Admin", revision.CanonicalHash, "127.0.0.1", "Browser", Now);

        revision.Supersede();
        Assert.Equal(TermsRevisionStatus.Superseded, revision.Status);
    }
}
