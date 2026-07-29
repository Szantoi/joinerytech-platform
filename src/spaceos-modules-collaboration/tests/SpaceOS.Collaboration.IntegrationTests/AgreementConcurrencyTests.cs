using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2/4 — the agreement's optimistic concurrency token, measured against PostgreSQL.
/// </summary>
/// <remarks>
/// <para>
/// The InMemory provider does not enforce concurrency tokens, so a test written there would pass
/// with the mapping deleted. This one runs on a real relational provider, where EF puts the
/// loaded version into the UPDATE's WHERE clause and reports zero affected rows as
/// <see cref="DbUpdateConcurrencyException"/>.
/// </para>
/// <para>
/// These tests connect as the migrator role on purpose. A superuser bypasses RLS, which is
/// exactly what is wanted here: the subject is the concurrency token, and routing through the
/// tenant session key would make an unrelated failure look like a concurrency result. Isolation
/// has its own suite that never touches this role.
/// </para>
/// </remarks>
public sealed class AgreementConcurrencyTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_concurrency");
    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private Guid _agreementId;

    private DbContextOptions<CollaborationDbContext> Options =>
        new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var db = new CollaborationDbContext(Options);
        await db.Database.MigrateAsync();

        var agreement = CollaborationAgreement.Create(_host, _guest, "Contended", DateTimeOffset.UtcNow);
        agreement.Propose(_host, Guid.NewGuid(), DateTimeOffset.UtcNow);
        db.Agreements.Add(agreement);
        await db.SaveChangesAsync();
        _agreementId = agreement.Id;
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task A_transition_increments_the_stored_version()
    {
        await using var db = new CollaborationDbContext(Options);
        var agreement = await db.Agreements.SingleAsync(a => a.Id == _agreementId);

        // Created (1) then proposed (2) during seeding.
        Assert.Equal(2, agreement.RowVersion);
    }

    [Fact]
    public async Task The_loser_of_a_cancel_versus_accept_race_is_told_it_lost()
    {
        // Both transitions are legal from Proposed: the host may withdraw, the guest may accept.
        // This is the race the token exists for — the outcome must not be "both succeeded".
        await using var hostView = new CollaborationDbContext(Options);
        await using var guestView = new CollaborationDbContext(Options);

        var asHost = await hostView.Agreements.SingleAsync(a => a.Id == _agreementId);
        var asGuest = await guestView.Agreements.SingleAsync(a => a.Id == _agreementId);

        asGuest.Accept(_guest, Guid.NewGuid(), Guid.NewGuid(), "signed:doc-1", DateTimeOffset.UtcNow);
        await guestView.SaveChangesAsync();

        asHost.Cancel(_host, Guid.NewGuid(), "changed our mind", DateTimeOffset.UtcNow);

        await Assert.ThrowsAnyAsync<DbUpdateConcurrencyException>(() => hostView.SaveChangesAsync());
    }

    [Fact]
    public async Task The_winner_of_that_race_is_what_the_database_holds()
    {
        await using var hostView = new CollaborationDbContext(Options);
        await using var guestView = new CollaborationDbContext(Options);

        var asHost = await hostView.Agreements.SingleAsync(a => a.Id == _agreementId);
        var asGuest = await guestView.Agreements.SingleAsync(a => a.Id == _agreementId);

        asGuest.Accept(_guest, Guid.NewGuid(), Guid.NewGuid(), "signed:doc-1", DateTimeOffset.UtcNow);
        await guestView.SaveChangesAsync();

        asHost.Cancel(_host, Guid.NewGuid(), "changed our mind", DateTimeOffset.UtcNow);
        await Assert.ThrowsAnyAsync<DbUpdateConcurrencyException>(() => hostView.SaveChangesAsync());

        // Asserted from a third context so the answer comes from the database, not from either
        // party's tracked copy.
        await using var verify = new CollaborationDbContext(Options);
        var stored = await verify.Agreements.SingleAsync(a => a.Id == _agreementId);

        Assert.Equal(AgreementStatus.Accepted, stored.Status);
        Assert.Equal(3, stored.RowVersion);
    }
}
