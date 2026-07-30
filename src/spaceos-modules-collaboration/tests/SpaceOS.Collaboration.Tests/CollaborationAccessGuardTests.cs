using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Application.WorkPackages;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F3/1 — grant-based authorization: the first code in this module that READS a grant.
/// </summary>
/// <remarks>
/// <para>
/// B2B-02 stayed <c>changes_requested</c> on exactly these points: a guest without a grant was
/// refused nothing, and a revoked or expired grant closed nothing, because
/// <see cref="CollaborationParticipantGrant.IsActive"/> had no caller. F2's root decision drew the
/// line — row-level security filters participation, the grant governs permission — and this is the
/// permission half.
/// </para>
/// </remarks>
public class CollaborationAccessGuardTests
{
    private static readonly Guid Host = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Guest = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Stranger = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid GuestUser = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 9, 0, 0, TimeSpan.Zero);

    private static CollaborationAgreement Agreement() =>
        CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now.AddDays(-10));

    // ---------------------------------------------------------------------------------------
    // Who gets through
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task The_host_needs_no_grant_on_its_own_agreement()
    {
        // The host is the party that ISSUES grants; requiring it to hold one would mean granting
        // yourself permission to permit.
        var agreement = Agreement();
        var guard = AuthKit.Guard(agreement, Host, HostUser, Now);

        var loaded = await guard.EnsureCapabilityAsync(
            agreement.Id, Host, CollaborationCapability.WorkPackageExecute);

        Assert.Equal(agreement.Id, loaded.Id);
    }

    [Fact]
    public async Task A_guest_holding_an_active_grant_is_let_through()
    {
        var agreement = Agreement();
        agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-1));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var loaded = await guard.EnsureCapabilityAsync(
            agreement.Id, Guest, CollaborationCapability.WorkPackageExecute);

        Assert.Equal(agreement.Id, loaded.Id);
    }

    [Fact]
    public async Task A_guest_may_answer_the_agreement_itself_without_any_grant()
    {
        // The scope decision this slice carries: the agreement is participation-gated, because
        // grants are issued BY the agreement — a guest that needed one to accept could never get
        // to a state where grants exist.
        var agreement = Agreement();
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var loaded = await guard.EnsureParticipationAsync(agreement.Id, Guest);

        Assert.Equal(agreement.Id, loaded.Id);
        Assert.Empty(agreement.Grants);
    }

    // ---------------------------------------------------------------------------------------
    // Fail-closed: the B2B-02 tickets
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task A_guest_without_any_grant_cannot_touch_what_the_agreement_carries()
    {
        var agreement = Agreement();
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, CollaborationCapability.WorkPackageExecute));

        Assert.Equal(CollaborationDenialReason.NoGrant, denial.Reason);
    }

    [Fact]
    public async Task A_revoked_grant_closes_immediately()
    {
        var agreement = Agreement();
        var grant = agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-5));
        grant.Revoke("the subcontract ended", Now.AddDays(-1));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, CollaborationCapability.WorkPackageExecute));

        Assert.Equal(CollaborationDenialReason.GrantRevoked, denial.Reason);
    }

    [Fact]
    public async Task An_expired_grant_closes_at_the_moment_it_lapses()
    {
        // The boundary itself, not a day either side of it: a grant valid "until 09:00" must not
        // be usable AT 09:00. Off-by-one here is a permission that outlives its own end date.
        var agreement = Agreement();
        agreement.AddGrant(
            CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-5), expiresAtUtc: Now);
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, CollaborationCapability.WorkPackageExecute));

        Assert.Equal(CollaborationDenialReason.GrantExpired, denial.Reason);
    }

    [Fact]
    public async Task The_same_grant_one_tick_before_expiry_still_works()
    {
        // The negative control for the test above: without this, "everything expired" would also
        // pass, and the boundary assertion would prove nothing.
        var agreement = Agreement();
        agreement.AddGrant(
            CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-5),
            expiresAtUtc: Now.AddTicks(1));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var loaded = await guard.EnsureCapabilityAsync(
            agreement.Id, Guest, CollaborationCapability.WorkPackageExecute);

        Assert.Equal(agreement.Id, loaded.Id);
    }

    [Fact]
    public async Task A_grant_for_another_capability_does_not_carry_over()
    {
        var agreement = Agreement();
        agreement.AddGrant(CollaborationCapability.WorkPackageRead, Guid.NewGuid(), Now.AddDays(-5));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, CollaborationCapability.WorkPackageExecute));

        Assert.Equal(CollaborationDenialReason.NoGrant, denial.Reason);
    }

    [Fact]
    public async Task Capability_matching_is_exact_rather_than_hierarchical()
    {
        // A prefix match would hand every future "collaboration.workpackage.*" capability to a
        // grant issued today. Widening a permission has to be an act.
        var agreement = Agreement();
        agreement.AddGrant("collaboration.workpackage", Guid.NewGuid(), Now.AddDays(-5));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, CollaborationCapability.WorkPackageExecute));
    }

    [Fact]
    public async Task A_grant_typed_with_different_casing_or_padding_still_matches()
    {
        // The counterpart of the exactness rule: the scope is normalised on both sides, so a
        // grant issued as " Collaboration.WorkPackage.Execute " is the same permission.
        var agreement = Agreement();
        agreement.AddGrant("  Collaboration.WorkPackage.Execute  ", Guid.NewGuid(), Now.AddDays(-5));
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var loaded = await guard.EnsureCapabilityAsync(
            agreement.Id, Guest, CollaborationCapability.WorkPackageExecute);

        Assert.Equal(agreement.Id, loaded.Id);
    }

    // ---------------------------------------------------------------------------------------
    // 404 vs 403, and the spoofing gate
    // ---------------------------------------------------------------------------------------

    [Fact]
    public async Task An_outside_tenant_is_told_nothing_more_than_not_found()
    {
        // 404, not 403: a "you are not permitted" would confirm that this identifier names a real
        // collaboration between two companies.
        var agreement = Agreement();
        var guard = AuthKit.Guard(agreement, Stranger, HostUser, Now);

        await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Stranger, CollaborationCapability.WorkPackageExecute));
    }

    [Fact]
    public async Task A_foreign_agreement_and_an_absent_one_answer_identically()
    {
        var agreement = Agreement();
        var foreign = await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            AuthKit.Guard(agreement, Stranger, HostUser, Now).EnsureParticipationAsync(agreement.Id, Stranger));

        var absent = await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            AuthKit.Guard(null, Stranger, HostUser, Now).EnsureParticipationAsync(agreement.Id, Stranger));

        Assert.Equal(absent.Message, foreign.Message);
        Assert.Equal(absent.ResourceKind, foreign.ResourceKind);
    }

    [Fact]
    public async Task A_payload_claiming_another_tenant_is_refused_before_anything_is_read()
    {
        // B2B-02's body/header spoofing ticket. The check runs first on purpose: even the LOAD is
        // denied, so a spoofed request cannot be used to time or probe another tenant's data.
        var agreement = Agreement();
        var repository = new AuthKit.InMemoryAgreementRepository(agreement);
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now, repository);

        var mismatch = await Assert.ThrowsAsync<CollaborationActorMismatchException>(() =>
            guard.EnsureParticipationAsync(agreement.Id, claimedActorTenantId: Host));

        Assert.Equal(Guest, mismatch.CallerTenantId);
        Assert.Equal(Host, mismatch.ClaimedTenantId);
        Assert.Equal(0, repository.LoadCount);
    }

    [Fact]
    public async Task An_unknown_capability_is_reported_as_a_typo_not_as_a_missing_grant()
    {
        var agreement = Agreement();
        var guard = AuthKit.Guard(agreement, Guest, GuestUser, Now);

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            guard.EnsureCapabilityAsync(agreement.Id, Guest, "collaboration.workpackage.exceute"));

        Assert.Equal(CollaborationDenialReason.UnknownCapability, denial.Reason);
    }

    [Fact]
    public async Task Without_an_authenticated_caller_nothing_is_authorized()
    {
        // Fail-loud rather than fail-open: an unresolved caller must not become "tenant
        // Guid.Empty", which would then match whoever else also has none.
        var guard = new CollaborationAccessGuard(
            new AuthKit.UnresolvedCallerContext(),
            new AuthKit.InMemoryAgreementRepository(Agreement()),
            new AuthKit.FixedClock(Now),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<CollaborationAccessGuard>.Instance);

        await Assert.ThrowsAsync<CollaborationCallerUnresolvedException>(() =>
            guard.EnsureParticipationAsync(Guid.NewGuid(), Guest));
    }

    // ---------------------------------------------------------------------------------------
    // The gate is wired in, not merely available
    // ---------------------------------------------------------------------------------------

    private sealed class OneWorkPackageRepository(DelegatedWorkPackage package) : IWorkPackageRepository
    {
        public int SaveCount { get; private set; }

        public Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default)
            => Task.FromResult<DelegatedWorkPackage?>(package.Id == workPackageId ? package : null);

        public Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task A_revoked_grant_stops_a_work_package_transition_the_domain_would_have_allowed()
    {
        // The measurement that says the guard is LOAD-BEARING: everything here is legal by the
        // FSM — the guest accepting an offered package — and the only thing standing in the way is
        // the withdrawn grant. Remove the guard call from the handler and this test goes red.
        var agreement = Agreement();
        var grant = agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-5));

        var package = DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(20), Now.AddDays(-2));
        package.Offer(Host, HostUser, Now.AddDays(-1));

        grant.Revoke("the subcontract ended", Now.AddHours(-1));

        var repository = new OneWorkPackageRepository(package);
        var handler = new AcceptWorkPackageHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now),
            repository, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));

        var denial = await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            handler.Handle(new AcceptWorkPackageCommand(package.Id, Guest, GuestUser), default));

        Assert.Equal(CollaborationDenialReason.GrantRevoked, denial.Reason);
        Assert.Equal(WorkPackageStatus.Offered, package.Status);
        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task A_spoofed_actor_on_a_work_package_command_never_reaches_the_aggregate()
    {
        var agreement = Agreement();
        agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now.AddDays(-5));

        var package = DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db", Now.AddDays(20), Now.AddDays(-2));

        var repository = new OneWorkPackageRepository(package);
        // The token says guest; the payload claims to be acting as the host.
        var handler = new OfferWorkPackageHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now),
            repository, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));

        await Assert.ThrowsAsync<CollaborationActorMismatchException>(() =>
            handler.Handle(new OfferWorkPackageCommand(package.Id, Host, HostUser), default));

        Assert.Equal(WorkPackageStatus.Draft, package.Status);
        Assert.Equal(0, repository.SaveCount);
    }
}
