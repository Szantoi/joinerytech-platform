using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.HR.Infrastructure.Persistence;
using Xunit;

namespace SpaceOS.Modules.HR.Tests.Integration;

/// <summary>
/// STAB-RLS-PROOF: proves that HR's FORCE RLS is real enforcement against a genuine
/// <c>NOSUPERUSER</c>/<c>NOBYPASSRLS</c> application role — never the migrator/superuser that
/// runs the EF migrations. Owns its own dedicated PostgreSQL Testcontainer so this class's role
/// provisioning cannot interfere with the rest of the assembly's integration tests.
/// </summary>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private const string Schema = "hr";

    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();

    private static readonly string[] AllForceRlsTables = ["employees", "absences", "employee_skills"];

    private readonly NonSuperuserRlsFixture _fixture = new("hr_rls_proof");

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<HRDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new HRDbContext(options))
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
        var employeeId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO hr.employees
                    ("Id", "TenantId", "Name", "Role", "Department", "FacilityId", "PayGrade",
                     "WeeklyHours", "Email", "VacationBase", "Active", "Initials")
                VALUES (@id, @tenant, 'Kovacs Anna', 'Asztalos', 'Gyartas', @facility, 'SkilledWorker',
                        40, 'anna.kovacs@example.test', 20, true, 'KA')
                """,
                ("id", employeeId), ("tenant", TenantA), ("facility", Guid.NewGuid()));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employees WHERE \"Id\" = @id", ("id", employeeId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employees WHERE \"Id\" = @id", ("id", employeeId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, null);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employees WHERE \"Id\" = @id", ("id", employeeId));
            Assert.Equal(0, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var countB = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employees WHERE \"Id\" = @id", ("id", employeeId));
            Assert.Equal(0, countB);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var countA = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employees WHERE \"Id\" = @id", ("id", employeeId));
            Assert.Equal(1, countA);
        }
    }

    [Fact]
    public async Task Child_table_exists_policy_isolates_by_parent_tenant()
    {
        var connectionString = _fixture.AppConnectionString();
        var employeeId = Guid.NewGuid();
        var skillId = Guid.NewGuid();

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);

            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO hr.employees
                    ("Id", "TenantId", "Name", "Role", "Department", "FacilityId", "PayGrade",
                     "WeeklyHours", "Email", "VacationBase", "Active", "Initials")
                VALUES (@id, @tenant, 'Nagy Bela', 'Asztalos', 'Gyartas', @facility, 'Master',
                        40, 'bela.nagy@example.test', 25, true, 'NB')
                """,
                ("id", employeeId), ("tenant", TenantA), ("facility", Guid.NewGuid()));

            // Child INSERT's WITH CHECK is the EXISTS-against-parent policy: it only succeeds
            // because the session tenant (A) matches the parent employee's TenantId.
            await RlsSql.ExecuteAsync(conn, """
                INSERT INTO hr.employee_skills ("Id", "Key", "Level", "EmployeeId")
                VALUES (@id, 'CNC-marogep', 'Halado', @employeeId)
                """,
                ("id", skillId), ("employeeId", employeeId));
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantA);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employee_skills WHERE \"Id\" = @id", ("id", skillId));
            Assert.Equal(1, count);
        }

        await using (var conn = await RlsSql.OpenAsync(connectionString))
        {
            await NonSuperuserRlsFixture.SetTenantAsync(conn, TenantB);
            var count = await RlsSql.CountAsync(conn,
                "SELECT count(*) FROM hr.employee_skills WHERE \"Id\" = @id", ("id", skillId));
            Assert.Equal(0, count);
        }
    }
}
