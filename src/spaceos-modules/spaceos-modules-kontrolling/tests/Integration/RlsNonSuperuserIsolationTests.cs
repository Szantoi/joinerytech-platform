using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.Kontrolling.Tests.Integration;

/// <summary>
/// STAB-RLS-PROOF: proves that Kontrolling's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role — never the migrator/superuser that
/// runs the EF migrations. Owns its own dedicated PostgreSQL Testcontainer so this class's role
/// provisioning cannot interfere with the rest of the assembly's integration tests
/// (<c>KontrollingIntegrationTests</c>).
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "kontrolling";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables =
        ["overhead_configs", "cost_adjustments", "overhead_rules"];

    private readonly NonSuperuserRlsFixture _fixture = new("kontrolling_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<KontrollingDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new KontrollingDbContext(options))
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
        var configId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO kontrolling.overhead_configs
                    (overhead_config_id, tenant_id, allocation_method, overhead_rate, updated_at, updated_by)
                VALUES (@id, @tenant, 'DirectCostPercentage', 0.15, now(), @updatedBy)
                """,
                ("id", configId), ("tenant", TenantA), ("updatedBy", Guid.NewGuid()));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_configs WHERE overhead_config_id = @id", ("id", configId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_configs WHERE overhead_config_id = @id", ("id", configId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_configs WHERE overhead_config_id = @id", ("id", configId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_configs WHERE overhead_config_id = @id", ("id", configId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_configs WHERE overhead_config_id = @id", ("id", configId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var configId = Guid.NewGuid();
        var ruleId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO kontrolling.overhead_configs
                    (overhead_config_id, tenant_id, allocation_method, overhead_rate, updated_at, updated_by)
                VALUES (@id, @tenant, 'DirectCostPercentage', 0.2, now(), @updatedBy)
                """,
                ("id", configId), ("tenant", TenantA), ("updatedBy", Guid.NewGuid()));

            // Child INSERT's WITH CHECK is the EXISTS-against-parent policy: it only succeeds
            // because the session tenant (A) matches the parent config's tenant_id.
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO kontrolling.overhead_rules (id, overhead_config_id, cost_category, exclude)
                VALUES (@id, @configId, 'Material', false)
                """,
                ("id", ruleId), ("configId", configId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_rules WHERE id = @id", ("id", ruleId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM kontrolling.overhead_rules WHERE id = @id", ("id", ruleId));
            Assert.Equal(0, count);
        }
    }
}
