using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.Hosting.RlsFixtures;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration;

/// <summary>
/// STAB-RLS-PROOF: proves that CRM's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role — never the migrator/superuser that
/// runs the EF migrations. The rest of this test project is Docker-free (InMemory); this class
/// owns its own dedicated PostgreSQL Testcontainer, the first real-Postgres integration test
/// for CRM.
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "crm";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables =
    [
        "leads", "opportunities",
        "lead_activities", "lead_tasks", "opportunity_activities", "opportunity_tasks",
    ];

    private readonly NonSuperuserRlsFixture _fixture = new("crm_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<CrmDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new CrmDbContext(options))
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
        var leadId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO crm."leads"
                    ("Id", "Status", contact_name, contact_email, "Source", "AssignedTo",
                     "CreatedAt", "CreatedBy", "TenantId")
                VALUES (@id, 'New', 'Teszt Elek', 'teszt.elek@example.test', 'Web', @assignedTo,
                        now(), @createdBy, @tenant)
                """,
                ("id", leadId), ("assignedTo", Guid.NewGuid()), ("createdBy", Guid.NewGuid()), ("tenant", TenantA));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"leads\" WHERE \"Id\" = @id", ("id", leadId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"leads\" WHERE \"Id\" = @id", ("id", leadId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"leads\" WHERE \"Id\" = @id", ("id", leadId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"leads\" WHERE \"Id\" = @id", ("id", leadId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"leads\" WHERE \"Id\" = @id", ("id", leadId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var leadId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO crm."leads"
                    ("Id", "Status", contact_name, contact_email, "Source", "AssignedTo",
                     "CreatedAt", "CreatedBy", "TenantId")
                VALUES (@id, 'New', 'Kiss Ilona', 'kiss.ilona@example.test', 'Referral', @assignedTo,
                        now(), @createdBy, @tenant)
                """,
                ("id", leadId), ("assignedTo", Guid.NewGuid()), ("createdBy", Guid.NewGuid()), ("tenant", TenantA));

            // Child INSERT's WITH CHECK is the EXISTS-against-parent policy: it only succeeds
            // because the session tenant (A) matches the parent lead's TenantId. "id" is a
            // serial identity column here, left to its default.
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO crm."lead_activities" ("Type", "Description", "CreatedBy", "CreatedAt", lead_id)
                VALUES ('Call', 'Elso hivas a leaddel', @createdBy, now(), @leadId)
                """,
                ("createdBy", Guid.NewGuid()), ("leadId", leadId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"lead_activities\" WHERE lead_id = @leadId", ("leadId", leadId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM crm.\"lead_activities\" WHERE lead_id = @leadId", ("leadId", leadId));
            Assert.Equal(0, count);
        }
    }
}
