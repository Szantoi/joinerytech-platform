using SpaceOS.Collaboration.Application.Agreements;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The application layer over the agreement lifecycle (B2B-10 F1/3).
/// </summary>
public class AgreementCommandHandlerTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid HostUser = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid GuestUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid Terms = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class InMemoryAgreementRepository(CollaborationAgreement? seed) : IAgreementRepository
    {
        private CollaborationAgreement? _stored = seed;

        public int SaveCount { get; private set; }

        public Task<CollaborationAgreement?> GetByIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
            => Task.FromResult(_stored?.Id == agreementId ? _stored : null);

        public Task AddAsync(CollaborationAgreement agreement, CancellationToken cancellationToken = default)
        {
            _stored = agreement;
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    private static CollaborationAgreement Draft() =>
        CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now);

    [Fact]
    public async Task Proposing_moves_the_agreement_and_reports_the_new_status()
    {
        var agreement = Draft();
        var repository = new InMemoryAgreementRepository(agreement);
        var handler = new ProposeAgreementHandler(
            AuthKit.Guard(agreement, Host, HostUser, Now, repository), repository, new FixedClock(Now));

        var status = await handler.Handle(
            new ProposeAgreementCommand(agreement.Id, Host, HostUser), default);

        Assert.Equal(AgreementStatus.Proposed, status.Status);
        Assert.Equal(1, repository.SaveCount);

        // The transition also reports the version the caller must send as its next If-Match
        // (B2B-10 F3/3) — every transition moves it.
        Assert.Equal(agreement.RowVersion, status.RowVersion);
    }

    [Fact]
    public async Task Accepting_binds_the_terms_and_the_evidence_through_the_handler()
    {
        var agreement = Draft();
        agreement.Propose(Host, HostUser, Now);
        var repository = new InMemoryAgreementRepository(agreement);
        var handler = new AcceptAgreementHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now, repository), repository, new FixedClock(Now));

        var status = await handler.Handle(
            new AcceptAgreementCommand(agreement.Id, Guest, GuestUser, Terms, "signed:doc-1"), default);

        Assert.Equal(AgreementStatus.Accepted, status.Status);
        Assert.Equal(Terms, agreement.CurrentTermsRevisionId);
        Assert.Equal("signed:doc-1", agreement.AcceptanceEvidence);
    }

    [Fact]
    public async Task The_handler_lets_the_domain_refuse_the_wrong_actor()
    {
        // The host proposing is legal; the GUEST proposing is not, and the rule stays in the
        // aggregate rather than being re-checked here.
        var agreement = Draft();
        var repository = new InMemoryAgreementRepository(agreement);
        // The guest IS a party, so authorization lets it through — and the aggregate is what
        // refuses. That order is the point: a party acting out of turn must meet the domain rule,
        // not an access check that happens to have the same effect.
        var handler = new ProposeAgreementHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now, repository), repository, new FixedClock(Now));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new ProposeAgreementCommand(agreement.Id, Guest, GuestUser), default));

        Assert.Equal(AgreementStatus.Draft, agreement.Status);
        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task An_unknown_agreement_is_not_found()
    {
        var repository = new InMemoryAgreementRepository(null);
        var handler = new ProposeAgreementHandler(
            AuthKit.Guard(null, Host, HostUser, Now, repository), repository, new FixedClock(Now));

        // Absent and not-mine answer identically (404) so that an identifier cannot be probed.
        await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            handler.Handle(new ProposeAgreementCommand(Guid.NewGuid(), Host, HostUser), default));
    }

    [Fact]
    public async Task The_injected_clock_lands_in_the_agreement_history()
    {
        var agreement = Draft();
        var moment = Now.AddHours(5);
        var repository = new InMemoryAgreementRepository(agreement);
        var handler = new ProposeAgreementHandler(
            AuthKit.Guard(agreement, Host, HostUser, moment, repository), repository, new FixedClock(moment));

        await handler.Handle(new ProposeAgreementCommand(agreement.Id, Host, HostUser), default);

        Assert.Equal(moment, agreement.History[^1].TimestampUtc);
    }

    [Fact]
    public void Acceptance_without_evidence_fails_validation_before_it_reaches_the_domain()
    {
        var result = new AcceptAgreementValidator()
            .Validate(new AcceptAgreementCommand(Guid.NewGuid(), Guest, GuestUser, Terms, ""));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Cancelling_without_a_reason_is_allowed_by_the_validator()
    {
        // Deliberately NOT stricter than the aggregate: an unanswered offer may be withdrawn
        // without a written reason, and a validator that demanded one would enforce a rule the
        // product does not have.
        var result = new CancelAgreementValidator()
            .Validate(new CancelAgreementCommand(Guid.NewGuid(), Host, HostUser, null));

        Assert.True(result.IsValid);
    }
}
