using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// The <c>projects</c> RLS policies, measured against a genuine NOSUPERUSER/NOBYPASSRLS role.
/// </summary>
/// <remarks>
/// Every assertion here would pass with the policies deleted if the connecting role were a
/// superuser — PostgreSQL bypasses RLS for superusers unconditionally, and <c>FORCE</c> does not
/// change that. The role properties are therefore asserted first, as a positive control on the
/// measurement itself rather than on the code.
/// </remarks>
public sealed class RlsNonSuperuserIsolationTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("projects_rls_proof");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private readonly Guid _projectA = Guid.NewGuid();
    private readonly Guid _projectB = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<ProjectsDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var context = new ProjectsDbContext(options))
            {
                await context.Database.MigrateAsync();
            }

            await using (var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString))
            {
                await InterceptorEndToEndTests.SeedProjectAsync(
                    connection, _projectA, TenantA, "PRJ-2026-010", "Tenant A job");
                await InterceptorEndToEndTests.SeedProjectAsync(
                    connection, _projectB, TenantB, "PRJ-2026-011", "Tenant B job");

                await RlsSql.ExecuteAsync(connection, $"""
                    INSERT INTO {ProjectsDbContext.SchemaName}."project_epic_assignments"
                        ("Id", "ProjectId", "TenantId", "EpicId", "AssignedAtUtc")
                    VALUES (@id, @project, @tenant, @epic, now())
                    """,
                    ("id", Guid.NewGuid()), ("project", _projectA),
                    ("tenant", TenantA), ("epic", Guid.NewGuid()));
            }

            await _fixture.CreateApplicationRoleAsync(ProjectsDbContext.SchemaName);
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private async Task<NpgsqlConnection> OpenAsTenantAsync(Guid? tenantId)
    {
        var connection = await RlsSql.OpenAsync(_fixture.AppConnectionString());
        await NonSuperuserRlsFixture.SetTenantAsync(connection, tenantId);
        return connection;
    }

    [Fact]
    public async Task The_application_role_is_neither_superuser_nor_bypassrls()
    {
        // The control on the measurement. Without it, every test below is vacuous.
        var (rolSuper, rolBypassRls) = await _fixture.ReadApplicationRolePropertiesAsync();

        Assert.False(rolSuper);
        Assert.False(rolBypassRls);
    }

    [Fact]
    public async Task Both_tables_have_RLS_enabled_AND_forced()
    {
        // FORCE is the half that is easy to lose: plain ENABLE does not apply to the table owner,
        // and the deploy role frequently owns what it migrates, leaving the policies silently
        // inert. Read from the catalog, because that is where the difference is visible.
        var states = await _fixture.ReadForceRlsCatalogAsync(
            ProjectsDbContext.SchemaName, "projects", "project_epic_assignments");

        Assert.Equal(2, states.Count);
        Assert.All(states, state =>
        {
            Assert.True(state.RelRowSecurity, $"{state.Table}: RLS not enabled");
            Assert.True(state.RelForceRowSecurity, $"{state.Table}: RLS not FORCEd");
        });
    }

    [Fact]
    public async Task A_tenant_sees_its_own_project_and_not_the_other_tenants()
    {
        await using var connection = await OpenAsTenantAsync(TenantA);

        var mine = await RlsSql.CountAsync(connection,
            $"""SELECT count(*) FROM {ProjectsDbContext.SchemaName}."projects" WHERE "Id" = @id""",
            ("id", _projectA));
        var theirs = await RlsSql.CountAsync(connection,
            $"""SELECT count(*) FROM {ProjectsDbContext.SchemaName}."projects" WHERE "Id" = @id""",
            ("id", _projectB));

        Assert.Equal(1, mine);
        Assert.Equal(0, theirs);
    }

    [Fact]
    public async Task Epic_assignments_are_isolated_by_their_own_tenant_column()
    {
        await using var connection = await OpenAsTenantAsync(TenantB);

        var visible = await RlsSql.CountAsync(connection,
            $"""SELECT count(*) FROM {ProjectsDbContext.SchemaName}."project_epic_assignments" """);

        Assert.Equal(0, visible);
    }

    [Fact]
    public async Task With_no_tenant_in_the_session_nothing_is_visible()
    {
        // The pool-reset state: the interceptor writes '' on connection close, and NULLIF turns
        // that into SQL NULL. Fail-closed, not fail-open and not an error — the bare
        // current_setting(...)::uuid this baseline replaced would raise 22P02 here instead.
        await using var connection = await OpenAsTenantAsync(null);

        var visible = await RlsSql.CountAsync(connection,
            $"""SELECT count(*) FROM {ProjectsDbContext.SchemaName}."projects" """);

        Assert.Equal(0, visible);
    }

    [Fact]
    public async Task A_tenant_cannot_write_a_row_belonging_to_another_tenant()
    {
        // WITH CHECK, not just USING. A policy with only USING lets a caller INSERT a row it will
        // then be unable to see — a write that silently vanishes is worse than a refused one.
        await using var connection = await OpenAsTenantAsync(TenantA);

        await Assert.ThrowsAsync<PostgresException>(() =>
            InterceptorEndToEndTests.SeedProjectAsync(
                connection, Guid.NewGuid(), TenantB, "PRJ-2026-099", "Smuggled"));
    }
}
