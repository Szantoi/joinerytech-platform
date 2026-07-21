using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests;

/// <summary>
/// STAB-RLS-PROOF: proves that EHS's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role — never the migrator/superuser role
/// that <see cref="Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.MigrateAsync"/>
/// runs as. Owns its own dedicated PostgreSQL Testcontainer (separate from
/// <see cref="EhsPostgresFixture"/>, which is shared by the repository tests and connects as a
/// superuser) so this class's role provisioning cannot interfere with the rest of the assembly.
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "ehs";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables =
    [
        "incidents", "risk_assessments", "training_records", "locations", "hazardous_materials",
        "ppe_items", "ppe_issuances", "safety_walks", "corrective_actions",
        "incident_investigations", "incident_witnesses", "risk_controls", "safety_walk_findings",
    ];

    private readonly NonSuperuserRlsFixture _fixture = new("ehs_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            // Migrations run as the migrator/admin (Testcontainers-provided superuser) — DDL
            // only, never used again after this point.
            var options = new DbContextOptionsBuilder<EhsDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new EhsDbContext(options))
            {
                await migrationContext.Database.MigrateAsync();
            }

            await _fixture.CreateApplicationRoleAsync(Schema);
        }
        catch
        {
            // Cleanup on a failed InitializeAsync: xUnit will NOT call DisposeAsync for a test
            // class whose InitializeAsync threw, so this class must clean up itself here.
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    [Fact]
    public async Task Application_role_is_not_superuser_and_does_not_bypass_rls()
    {
        var (rolSuper, rolBypassRls) = await _fixture.ReadApplicationRolePropertiesAsync();

        Assert.False(rolSuper);
        Assert.False(rolBypassRls);
    }

    [Fact]
    public async Task Catalog_reports_force_rls_on_every_documented_table()
    {
        var rows = await _fixture.ReadForceRlsCatalogAsync(Schema, AllForceRlsTables);

        Assert.Equal(AllForceRlsTables.Length, rows.Count);
        foreach (var row in rows)
        {
            Assert.True(row.RelRowSecurity, $"{row.Table}: relrowsecurity should be true");
            Assert.True(row.RelForceRowSecurity, $"{row.Table}: relforcerowsecurity should be true");
        }
    }

    [Fact]
    public async Task Root_aggregate_tenant_isolation_fail_closed_and_pool_reuse_has_no_leak()
    {
        // MaxPoolSize=1 deterministically forces the same physical connection to be handed back
        // by Npgsql's pool across sequential open/close, which is what the last clause of
        // Megvalósítás step 3 requires proof of.
        var connectionString = _fixture.AppConnectionString(maxPoolSize: 1);
        var safetyWalkId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO ehs."safety_walks"
                    (safety_walk_id, tenant_id, location_id, scheduled_date, conducted_by, participants, status)
                VALUES (@id, @tenant, @location, now(), @conductor, ARRAY[]::uuid[], 'Scheduled')
                """,
                ("id", safetyWalkId), ("tenant", TenantA), ("location", Guid.NewGuid()), ("conductor", Guid.NewGuid()));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walks\" WHERE safety_walk_id = @id", ("id", safetyWalkId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walks\" WHERE safety_walk_id = @id", ("id", safetyWalkId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walks\" WHERE safety_walk_id = @id", ("id", safetyWalkId));
            Assert.Equal(0, count);
        }

        // Pool-reuse: tenant B on a connection, close it (returns to the size-1 pool), then
        // reopen (Npgsql hands back the same physical connection) and switch to tenant A — no
        // leftover visibility of B's context, and A's own row is visible again.
        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walks\" WHERE safety_walk_id = @id", ("id", safetyWalkId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walks\" WHERE safety_walk_id = @id", ("id", safetyWalkId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var safetyWalkId = Guid.NewGuid();
        var findingId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO ehs."safety_walks"
                    (safety_walk_id, tenant_id, location_id, scheduled_date, conducted_by, participants, status)
                VALUES (@id, @tenant, @location, now(), @conductor, ARRAY[]::uuid[], 'Scheduled')
                """,
                ("id", safetyWalkId), ("tenant", TenantA), ("location", Guid.NewGuid()), ("conductor", Guid.NewGuid()));

            // Child INSERT's WITH CHECK is the EXISTS-against-parent policy: it only succeeds
            // because the session tenant (A) matches the parent row's tenant_id.
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO ehs."safety_walk_findings"
                    (finding_id, safety_walk_id, description, severity, requires_action, recorded_at)
                VALUES (@fid, @swid, 'Missing guard rail', 'High', true, now())
                """,
                ("fid", findingId), ("swid", safetyWalkId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walk_findings\" WHERE finding_id = @id", ("id", findingId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM ehs.\"safety_walk_findings\" WHERE finding_id = @id", ("id", findingId));
            Assert.Equal(0, count);
        }
    }
}
