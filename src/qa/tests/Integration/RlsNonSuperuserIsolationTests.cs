using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.QA.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.QA.Tests.Integration;

/// <summary>
/// STAB-RLS-PROOF: proves that QA's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role. Owns its own dedicated PostgreSQL
/// Testcontainer (the pre-existing <see cref="IntegrationTestFixture"/> connects as the
/// Testcontainers-provided superuser and is used by the rest of the assembly's integration
/// tests) so this class's role provisioning cannot interfere with them.
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "qa";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables =
    [
        "qa_checkpoints", "inspections", "tickets",
        "inspection_defects", "qa_checkpoint_criteria", "ticket_resolution_actions",
    ];

    private readonly NonSuperuserRlsFixture _fixture = new("qa_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<QADbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new QADbContext(options))
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
        var checkpointId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO qa.qa_checkpoints
                    (id, tenant_id, name, checkpoint_type, critical_level, is_active, created_at, updated_at)
                VALUES (@id, @tenant, 'Incoming inspection', 'Incoming', 'Major', true, now(), now())
                """,
                ("id", checkpointId), ("tenant", TenantA));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoints WHERE id = @id", ("id", checkpointId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoints WHERE id = @id", ("id", checkpointId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoints WHERE id = @id", ("id", checkpointId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoints WHERE id = @id", ("id", checkpointId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoints WHERE id = @id", ("id", checkpointId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var checkpointId = Guid.NewGuid();
        var criterionId = Guid.NewGuid().ToString();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO qa.qa_checkpoints
                    (id, tenant_id, name, checkpoint_type, critical_level, is_active, created_at, updated_at)
                VALUES (@id, @tenant, 'Final inspection', 'Final', 'Critical', true, now(), now())
                """,
                ("id", checkpointId), ("tenant", TenantA));

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO qa.qa_checkpoint_criteria (id, qa_checkpoint_id, type, description)
                VALUES (@cid, @qcid, 'Dimensional', 'Panel thickness within tolerance')
                """,
                ("cid", criterionId), ("qcid", checkpointId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoint_criteria WHERE id = @id", ("id", criterionId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM qa.qa_checkpoint_criteria WHERE id = @id", ("id", criterionId));
            Assert.Equal(0, count);
        }
    }
}
