using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2/4 — children added to an <i>already-tracked</i> parent are inserted, not silently
/// turned into an UPDATE of a row that does not exist.
/// </summary>
/// <remarks>
/// <para>
/// The aggregates assign their own Guid keys. Left to EF's convention, a non-default key on an
/// entity EF has not seen before reads as "this row already exists", and SaveChanges emits an
/// UPDATE matching nothing — which surfaces as <see cref="DbUpdateConcurrencyException"/>, a
/// message that points at concurrency when the actual cause is mapping. It cost a wrong diagnosis
/// once already; these tests make the real behaviour explicit.
/// </para>
/// <para>
/// The seeding path (<c>Add</c> on a whole new graph) never had this problem, which is why
/// nothing caught it: every existing test built its aggregate and saved it in one step. The bug
/// only appears on the second write, which is what a running system does most of the time.
/// </para>
/// </remarks>
public sealed class AggregateChildPersistenceTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_child_persistence");
    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private Guid _agreementId;

    private CollaborationDbContext NewContext() =>
        new(new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options);

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using var db = NewContext();
        await db.Database.MigrateAsync();

        var agreement = CollaborationAgreement.Create(_host, _guest, "Child persistence", DateTimeOffset.UtcNow);
        db.Agreements.Add(agreement);
        await db.SaveChangesAsync();
        _agreementId = agreement.Id;
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task A_grant_added_to_a_loaded_agreement_is_persisted()
    {
        await using (var db = NewContext())
        {
            var agreement = await db.Agreements.SingleAsync(a => a.Id == _agreementId);
            agreement.AddGrant("production.cutting", Guid.NewGuid(), DateTimeOffset.UtcNow);
            await db.SaveChangesAsync();
        }

        await using var verify = NewContext();
        var stored = await verify.Agreements
            .Include(a => a.Grants)
            .SingleAsync(a => a.Id == _agreementId);

        Assert.Single(stored.Grants);
        Assert.Equal("production.cutting", stored.Grants[0].CapabilityScope);
    }

    [Fact]
    public async Task A_transition_on_a_loaded_agreement_persists_its_history_entry()
    {
        await using (var db = NewContext())
        {
            var agreement = await db.Agreements.SingleAsync(a => a.Id == _agreementId);
            agreement.Propose(_host, Guid.NewGuid(), DateTimeOffset.UtcNow);
            await db.SaveChangesAsync();
        }

        await using var verify = NewContext();
        var stored = await verify.Agreements
            .Include(a => a.History)
            .SingleAsync(a => a.Id == _agreementId);

        // The audit trail is the point of the FSM: a transition that leaves no record is the
        // failure this whole slice exists to rule out.
        Assert.Single(stored.History);
        Assert.Equal("Propose", stored.History[0].ActionName);
        Assert.Equal(AgreementStatus.Proposed, stored.History[0].ToStatus);
    }
}
