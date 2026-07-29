using Microsoft.EntityFrameworkCore;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// B2B-10 F2/3 — the module's own query filters, asserted without the test writing a filter.
/// </summary>
/// <remarks>
/// <para>
/// Every query here is a bare <c>ToListAsync()</c>. That is the whole point: B2B-02's
/// cross-tenant tests wrote their own <c>Where(a =&gt; a.HostTenantId == ...)</c> and then
/// asserted it had filtered, which passes whether or not the module isolates anything. If the
/// <c>HasQueryFilter</c> calls were deleted, every assertion below would fail.
/// </para>
/// <para>
/// These run on the InMemory provider, which cannot enforce RLS — and that is fine, because RLS
/// is not what is under test here. The database-level proof lives in
/// <c>SpaceOS.Collaboration.IntegrationTests</c> against a real PostgreSQL with a non-superuser
/// role. This file measures the second layer only, and says so.
/// </para>
/// </remarks>
public class TenantQueryFilterTests
{
    private sealed class FixedTenantContext(Guid? tenantId) : ITenantContext
    {
        public bool HasTenant => tenantId.HasValue;
        public Guid TenantId => tenantId ?? throw new InvalidOperationException("No tenant in scope.");
    }

    private static readonly Guid Host = Guid.NewGuid();
    private static readonly Guid Guest = Guid.NewGuid();
    private static readonly Guid Stranger = Guid.NewGuid();

    private static DbContextOptions<CollaborationDbContext> NewDatabase() =>
        new DbContextOptionsBuilder<CollaborationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static async Task SeedAsync(DbContextOptions<CollaborationDbContext> options)
    {
        // Seeded through the tenant-less constructor, so the fixture itself is not subject to the
        // filter it is setting up.
        await using var db = new CollaborationDbContext(options);
        db.Agreements.Add(CollaborationAgreement.Create(Host, Guest, "Shared", DateTimeOffset.UtcNow));
        db.Agreements.Add(CollaborationAgreement.Create(Stranger, Guid.NewGuid(), "Foreign", DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Each_participant_sees_the_shared_agreement_and_not_the_foreign_one(bool asHost)
    {
        var options = NewDatabase();
        await SeedAsync(options);

        await using var db = new CollaborationDbContext(options, new FixedTenantContext(asHost ? Host : Guest));
        var visible = await db.Agreements.ToListAsync();

        Assert.Single(visible);
        Assert.Equal("Shared", visible[0].Title);
    }

    [Fact]
    public async Task A_tenant_that_participates_in_nothing_sees_nothing()
    {
        var options = NewDatabase();
        await SeedAsync(options);

        await using var db = new CollaborationDbContext(options, new FixedTenantContext(Guid.NewGuid()));

        Assert.Empty(await db.Agreements.ToListAsync());
    }

    [Fact]
    public async Task The_filter_also_covers_a_lookup_by_primary_key()
    {
        // A filter that only applied to set-wide queries would leave the most common leak path
        // open: fetching another tenant's row by an id the caller happens to know.
        var options = NewDatabase();
        await SeedAsync(options);

        Guid foreignId;
        await using (var seeded = new CollaborationDbContext(options))
        {
            foreignId = (await seeded.Agreements.SingleAsync(a => a.Title == "Foreign")).Id;
        }

        await using var db = new CollaborationDbContext(options, new FixedTenantContext(Host));

        Assert.Null(await db.Agreements.SingleOrDefaultAsync(a => a.Id == foreignId));
    }

    [Fact]
    public async Task Without_a_resolved_tenant_the_filter_passes_everything()
    {
        // Documented behaviour, not an accident: in a deployed host the same "no tenant" state
        // makes the interceptor write '' into the session key, and the RLS policies return zero
        // rows. Asserting it here keeps the choice visible instead of letting a future change
        // flip it silently in either direction.
        var options = NewDatabase();
        await SeedAsync(options);

        await using var db = new CollaborationDbContext(options, new FixedTenantContext(null));

        Assert.Equal(2, (await db.Agreements.ToListAsync()).Count);
    }
}
