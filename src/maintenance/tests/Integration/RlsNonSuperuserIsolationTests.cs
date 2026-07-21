using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.Maintenance.Tests.Integration;

/// <summary>
/// STAB-RLS-PROOF: proves that Maintenance's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role — never the migrator/superuser that
/// runs the EF migrations. Owns its own dedicated PostgreSQL Testcontainer so this class's role
/// provisioning cannot interfere with the rest of the assembly's integration tests.
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "maintenance";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables =
    [
        "assets", "work_orders", "asset_maintenance_plans", "work_order_parts",
    ];

    private readonly NonSuperuserRlsFixture _fixture = new("maintenance_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<MaintenanceDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new MaintenanceDbContext(options))
            {
                await migrationContext.Database.MigrateAsync();
            }

            await _fixture.CreateApplicationRoleAsync(Schema);
        }
        catch
        {
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
        var connectionString = _fixture.AppConnectionString(maxPoolSize: 1);
        var assetId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO maintenance.assets
                    (id, tenant_id, code, name, kind, facility_id, location, operating_hours, retired)
                VALUES (@id, @tenant, 'CNC-01', 'CNC marogep', 'Machine', @facility, 'Csarnok A', 0, false)
                """,
                ("id", assetId), ("tenant", TenantA), ("facility", Guid.NewGuid()));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.assets WHERE id = @id", ("id", assetId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.assets WHERE id = @id", ("id", assetId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.assets WHERE id = @id", ("id", assetId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.assets WHERE id = @id", ("id", assetId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.assets WHERE id = @id", ("id", assetId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var assetId = Guid.NewGuid();
        var planId = Guid.NewGuid().ToString();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO maintenance.assets
                    (id, tenant_id, code, name, kind, facility_id, location, operating_hours, retired)
                VALUES (@id, @tenant, 'CNC-02', 'Elowag furogep', 'Machine', @facility, 'Csarnok B', 0, false)
                """,
                ("id", assetId), ("tenant", TenantA), ("facility", Guid.NewGuid()));

            // Child INSERT's WITH CHECK is the EXISTS-against-parent policy: it only succeeds
            // because the session tenant (A) matches the parent asset's tenant_id.
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO maintenance.asset_maintenance_plans
                    (id, asset_id, label, "trigger", estimated_hours)
                VALUES (@id, @assetId, 'Havi karbantartas', 'Calendar', 2.5)
                """,
                ("id", planId), ("assetId", assetId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.asset_maintenance_plans WHERE id = @id", ("id", planId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM maintenance.asset_maintenance_plans WHERE id = @id", ("id", planId));
            Assert.Equal(0, count);
        }
    }
}
