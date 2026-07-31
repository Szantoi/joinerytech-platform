using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application;
using SpaceOS.Collaboration.Application.Adapters;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Application.WorkPackages;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The application layer over the work-package FSM (B2B-10 F1/2), now behind the F3 access guard.
/// </summary>
/// <remarks>
/// The handlers are built with the REAL guard over a real agreement carrying a real grant. Handing
/// them a permissive double would leave these tests green no matter what the guard did.
/// </remarks>
public class WorkPackageCommandHandlerTests
{
    private static readonly Guid Host = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Guest = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid GuestUser = Guid.Parse("66666666-6666-6666-6666-666666666666");
    private static readonly Guid Stranger = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);

    private sealed class InMemoryWorkPackageRepository(DelegatedWorkPackage? seed) : IWorkPackageRepository
    {
        private DelegatedWorkPackage? _stored = seed;

        public int SaveCount { get; private set; }

        public Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default)
            => Task.FromResult(_stored?.Id == workPackageId ? _stored : null);

        public Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default)
        {
            _stored = workPackage;
            return Task.CompletedTask;
        }

        public Task<Guid?> GetDelegatedProjectIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
            => Task.FromResult(
                _stored?.AgreementId == agreementId ? _stored.WorkScope?.ProjectId : null);

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    /// <summary>An agreement that really carries the execute grant the guard will look for.</summary>
    private static CollaborationAgreement GrantedAgreement()
    {
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now);
        agreement.AddGrant(CollaborationCapability.WorkPackageExecute, Guid.NewGuid(), Now);
        return agreement;
    }

    private static DelegatedWorkPackage DraftPackage(CollaborationAgreement agreement) =>
        DelegatedWorkPackage.Create(
            agreement.Id, Host, Guest, "Ajtólap gyártás", "50 db tölgy ajtólap", Now.AddDays(30), Now);

    [Fact]
    public async Task The_handler_moves_the_package_and_returns_the_fresh_read_model()
    {
        var agreement = GrantedAgreement();
        var package = DraftPackage(agreement);
        var repository = new InMemoryWorkPackageRepository(package);
        var handler = new OfferWorkPackageHandler(
            AuthKit.Guard(agreement, Host, HostUser, Now),
            repository, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));

        var view = await handler.Handle(
            new OfferWorkPackageCommand(package.Id, Host, HostUser), default);

        Assert.Equal(WorkPackageStatus.Offered, view.Status);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task The_handler_does_not_swallow_the_domain_guard()
    {
        // The point of "no second truth": the actor rule lives in the aggregate, and the handler
        // must let it through rather than re-checking (or worse, re-interpreting) it. The guest is
        // a party and holds the grant, so authorization passes and the DOMAIN is what refuses an
        // Accept from the Draft state.
        var agreement = GrantedAgreement();
        var package = DraftPackage(agreement);
        var handler = new AcceptWorkPackageHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now),
            new InMemoryWorkPackageRepository(package), new CollaborationProjectionService(),
            new AuthKit.FixedClock(Now));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new AcceptWorkPackageCommand(package.Id, Guest, GuestUser), default));

        Assert.Equal(WorkPackageStatus.Draft, package.Status);
    }

    [Fact]
    public async Task A_tenant_outside_the_agreement_is_refused_before_the_domain_sees_it()
    {
        // Since F3 a stranger no longer reaches the aggregate at all: it is not a party, so it
        // gets the same answer as for an agreement that does not exist.
        var agreement = GrantedAgreement();
        var package = DraftPackage(agreement);
        var repository = new InMemoryWorkPackageRepository(package);
        var handler = new OfferWorkPackageHandler(
            AuthKit.Guard(agreement, Stranger, HostUser, Now),
            repository, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));

        await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            handler.Handle(new OfferWorkPackageCommand(package.Id, Stranger, HostUser), default));

        Assert.Equal(WorkPackageStatus.Draft, package.Status);
        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task An_unknown_work_package_is_not_found()
    {
        var agreement = GrantedAgreement();
        var handler = new OfferWorkPackageHandler(
            AuthKit.Guard(agreement, Host, HostUser, Now),
            new InMemoryWorkPackageRepository(null), new CollaborationProjectionService(),
            new AuthKit.FixedClock(Now));

        await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            handler.Handle(new OfferWorkPackageCommand(Guid.NewGuid(), Host, HostUser), default));
    }

    [Fact]
    public async Task Nothing_is_saved_when_the_transition_is_refused()
    {
        // A refused transition must not reach SaveChanges: a partially applied aggregate would
        // be persisted otherwise.
        var agreement = GrantedAgreement();
        var package = DraftPackage(agreement);
        var repository = new InMemoryWorkPackageRepository(package);
        var handler = new AcceptWorkPackageHandler(
            AuthKit.Guard(agreement, Guest, GuestUser, Now),
            repository, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));

        await Assert.ThrowsAnyAsync<Exception>(() =>
            handler.Handle(new AcceptWorkPackageCommand(package.Id, Guest, GuestUser), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task The_injected_clock_is_what_lands_in_the_audit_trail()
    {
        var agreement = GrantedAgreement();
        var package = DraftPackage(agreement);
        var moment = Now.AddHours(7);
        var handler = new OfferWorkPackageHandler(
            AuthKit.Guard(agreement, Host, HostUser, moment),
            new InMemoryWorkPackageRepository(package), new CollaborationProjectionService(),
            new AuthKit.FixedClock(moment));

        await handler.Handle(new OfferWorkPackageCommand(package.Id, Host, HostUser), default);

        Assert.Equal(moment, package.History[^1].TimestampUtc);
    }

    [Fact]
    public void Every_work_package_command_resolves_a_handler_from_DI()
    {
        // The F3 host will resolve these through MediatR; a missing registration would only
        // surface as a runtime "no handler" at the first request.
        using var provider = new ServiceCollection()
            .AddCollaborationApplication()
            .AddScoped<IWorkPackageRepository>(_ => new InMemoryWorkPackageRepository(null))
            .AddScoped<IAgreementRepository>(_ => new AuthKit.InMemoryAgreementRepository(null))
            .AddScoped<ICollaborationCallerContext>(_ => new AuthKit.TestCallerContext(Host, HostUser))
            .AddLogging()
            .BuildServiceProvider();

        var mediator = provider.GetRequiredService<MediatR.IMediator>();

        Assert.NotNull(mediator);
        Assert.NotNull(provider.GetRequiredService<CollaborationProjectionService>());
        Assert.NotNull(provider.GetRequiredService<TimeProvider>());
        Assert.NotNull(provider.GetRequiredService<ICollaborationAccessGuard>());
        Assert.NotNull(provider.GetRequiredService<FluentValidation.IValidator<CancelWorkPackageCommand>>());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void A_cancellation_without_a_reason_fails_validation(string reason)
    {
        var result = new CancelWorkPackageValidator()
            .Validate(new CancelWorkPackageCommand(Guid.NewGuid(), Host, HostUser, reason));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void An_empty_identifier_fails_validation()
    {
        var result = new OfferWorkPackageValidator()
            .Validate(new OfferWorkPackageCommand(Guid.Empty, Host, HostUser));

        Assert.False(result.IsValid);
    }

    // ---------------------------------------------------------------------------------------
    // F5/1 — the create path
    // ---------------------------------------------------------------------------------------

    /// <summary>The one epic the seeded project adapter knows (F5/2): resolution is real, not permissive.</summary>
    private static readonly Guid KnownEpic = Guid.Parse("77777777-7777-7777-7777-777777777777");

    private static CreateWorkPackageCommand CreateCommand(
        CollaborationAgreement agreement,
        Guid actorTenantId,
        Guid actorUserId,
        Guid? projectId = null,
        Guid? epicId = null)
        => new(
            agreement.Id, actorTenantId, actorUserId, "Ajtólap gyártás", "50 db tölgy ajtólap",
            Now.AddDays(30), projectId ?? Guid.NewGuid(), epicId ?? KnownEpic);

    private static CreateWorkPackageHandler CreateHandler(
        CollaborationAgreement agreement,
        Guid callerTenantId,
        Guid callerUserId,
        InMemoryWorkPackageRepository repository)
    {
        // Seeded with exactly one epic — an adapter resolving everything would keep these tests
        // green with the resolution step deleted (the permissive-double mistake).
        var projects = new InMemoryProjectAdapter();
        projects.RegisterProject(new ProjectReference(KnownEpic, "Doorstar pilot projekt"));

        return new CreateWorkPackageHandler(
            AuthKit.Guard(agreement, callerTenantId, callerUserId, Now),
            repository, projects, new CollaborationProjectionService(), new AuthKit.FixedClock(Now));
    }

    [Fact]
    public async Task The_create_handler_persists_a_new_package_and_returns_its_view()
    {
        var agreement = GrantedAgreement();
        var repository = new InMemoryWorkPackageRepository(null);
        var handler = CreateHandler(agreement, Host, HostUser, repository);
        var projectId = Guid.NewGuid();

        var view = await handler.Handle(CreateCommand(agreement, Host, HostUser, projectId), default);

        Assert.Equal(WorkPackageStatus.Draft, view.Status);
        Assert.Equal(agreement.Id, view.AgreementId);
        Assert.Equal(1, view.RowVersion);
        Assert.Equal(projectId, view.WorkScope!.ProjectId);
        Assert.Contains("Offer", view.AllowedActions);
        Assert.Equal(1, repository.SaveCount);

        var stored = await repository.GetByIdAsync(view.WorkPackageId);
        Assert.Equal(projectId, stored!.WorkScope!.ProjectId);
    }

    [Fact]
    public async Task The_create_handler_refuses_a_stranger_before_anything_is_read_or_written()
    {
        var agreement = GrantedAgreement();
        var repository = new InMemoryWorkPackageRepository(null);
        var handler = CreateHandler(agreement, Stranger, HostUser, repository);

        await Assert.ThrowsAsync<CollaborationResourceNotFoundException>(() =>
            handler.Handle(CreateCommand(agreement, Stranger, HostUser), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task The_create_handler_lets_the_domain_refuse_the_guest()
    {
        // The guard passes — the guest is a party AND holds the execute grant — and the DOMAIN
        // says only the host delegates. The handler must not restate that rule, only let it
        // through.
        var agreement = GrantedAgreement();
        var repository = new InMemoryWorkPackageRepository(null);
        var handler = CreateHandler(agreement, Guest, GuestUser, repository);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(CreateCommand(agreement, Guest, GuestUser), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task A_guest_without_the_grant_is_stopped_by_the_guard_not_the_domain()
    {
        // Grant-gated like everything the agreement carries: without the execute grant the
        // refusal is the guard's fail-closed denial, and the domain's host-only rule stays
        // unreached and undisclosed.
        var agreement = CollaborationAgreement.Create(Host, Guest, "Doorstar pilot", Now);
        var repository = new InMemoryWorkPackageRepository(null);
        var handler = CreateHandler(agreement, Guest, GuestUser, repository);

        await Assert.ThrowsAsync<CollaborationAccessDeniedException>(() =>
            handler.Handle(CreateCommand(agreement, Guest, GuestUser), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task A_second_project_under_the_same_agreement_is_refused()
    {
        // The handler fetches the siblings' project as a FACT; the rule refusing the mismatch
        // stays in the domain. Seeding the repository with an anchored package is what makes the
        // fact non-null here.
        var agreement = GrantedAgreement();
        var firstProject = Guid.NewGuid();
        var seeded = agreement.DelegateWork(
            Host, HostUser, "Első csomag", "meglévő", Now.AddDays(10),
            CollaborationWorkScope.Create(firstProject, Guid.NewGuid()), null, Now.AddDays(-1));
        var repository = new InMemoryWorkPackageRepository(seeded);
        var handler = CreateHandler(agreement, Host, HostUser, repository);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(CreateCommand(agreement, Host, HostUser, Guid.NewGuid()), default));
        Assert.Equal(0, repository.SaveCount);

        var view = await handler.Handle(CreateCommand(agreement, Host, HostUser, firstProject), default);
        Assert.Equal(firstProject, view.WorkScope!.ProjectId);
    }

    [Fact]
    public async Task An_anchor_the_kernel_does_not_know_stops_the_birth()
    {
        // F5/2: the adapter's production call site. The host is authorized and the input is
        // well-formed; it is the RESOLUTION that says no, and nothing may be persisted.
        var agreement = GrantedAgreement();
        var repository = new InMemoryWorkPackageRepository(null);
        var handler = CreateHandler(agreement, Host, HostUser, repository);

        await Assert.ThrowsAsync<CollaborationAnchorUnresolvedException>(() =>
            handler.Handle(CreateCommand(agreement, Host, HostUser, epicId: Guid.NewGuid()), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public void A_create_without_its_anchor_ids_fails_validation()
    {
        var result = new CreateWorkPackageValidator().Validate(new CreateWorkPackageCommand(
            Guid.NewGuid(), Host, HostUser, "Ajtólap gyártás", "50 db",
            Now.AddDays(30), Guid.Empty, Guid.Empty));

        Assert.False(result.IsValid);
    }
}
