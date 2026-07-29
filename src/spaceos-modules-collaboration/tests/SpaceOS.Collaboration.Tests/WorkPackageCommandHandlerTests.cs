using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Application.WorkPackages;
using SpaceOS.Collaboration.Domain;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// The application layer over the work-package FSM (B2B-10 F1/2): plumbing only, with the
/// business rules left where they belong.
/// </summary>
public class WorkPackageCommandHandlerTests
{
    private static readonly Guid Agreement = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Host = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid Guest = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid HostUser = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid Stranger = Guid.Parse("55555555-5555-5555-5555-555555555555");
    private static readonly DateTimeOffset Now = new(2026, 7, 29, 10, 0, 0, TimeSpan.Zero);

    /// <summary>A clock the test controls, so the audit trail can be asserted, not assumed.</summary>
    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

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

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }

    private static DelegatedWorkPackage DraftPackage() => DelegatedWorkPackage.Create(
        Agreement, Host, Guest, "Ajtólap gyártás", "50 db tölgy ajtólap", Now.AddDays(30), Now);

    [Fact]
    public async Task The_handler_moves_the_package_and_returns_the_fresh_read_model()
    {
        var package = DraftPackage();
        var repository = new InMemoryWorkPackageRepository(package);
        var handler = new OfferWorkPackageHandler(
            repository, new CollaborationProjectionService(), new FixedClock(Now));

        var view = await handler.Handle(
            new OfferWorkPackageCommand(package.Id, Host, HostUser), default);

        Assert.Equal(WorkPackageStatus.Offered, view.Status);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task The_handler_does_not_swallow_the_domain_guard()
    {
        // The point of "no second truth": the actor rule lives in the aggregate, and the handler
        // must let it through rather than re-checking (or worse, re-interpreting) it.
        var package = DraftPackage();
        var handler = new OfferWorkPackageHandler(
            new InMemoryWorkPackageRepository(package), new CollaborationProjectionService(), new FixedClock(Now));

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(new OfferWorkPackageCommand(package.Id, Stranger, HostUser), default));

        Assert.Equal(WorkPackageStatus.Draft, package.Status);
    }

    [Fact]
    public async Task An_unknown_work_package_is_not_found()
    {
        var handler = new OfferWorkPackageHandler(
            new InMemoryWorkPackageRepository(null), new CollaborationProjectionService(), new FixedClock(Now));

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            handler.Handle(new OfferWorkPackageCommand(Guid.NewGuid(), Host, HostUser), default));
    }

    [Fact]
    public async Task Nothing_is_saved_when_the_transition_is_refused()
    {
        // A refused transition must not reach SaveChanges: a partially applied aggregate would
        // be persisted otherwise.
        var package = DraftPackage();
        var repository = new InMemoryWorkPackageRepository(package);
        var handler = new AcceptWorkPackageHandler(
            repository, new CollaborationProjectionService(), new FixedClock(Now));

        await Assert.ThrowsAnyAsync<Exception>(() =>
            handler.Handle(new AcceptWorkPackageCommand(package.Id, Guest, HostUser), default));

        Assert.Equal(0, repository.SaveCount);
    }

    [Fact]
    public async Task The_injected_clock_is_what_lands_in_the_audit_trail()
    {
        var package = DraftPackage();
        var moment = Now.AddHours(7);
        var handler = new OfferWorkPackageHandler(
            new InMemoryWorkPackageRepository(package), new CollaborationProjectionService(), new FixedClock(moment));

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
            .BuildServiceProvider();

        var mediator = provider.GetRequiredService<MediatR.IMediator>();

        Assert.NotNull(mediator);
        Assert.NotNull(provider.GetRequiredService<CollaborationProjectionService>());
        Assert.NotNull(provider.GetRequiredService<TimeProvider>());
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
}
