using Microsoft.EntityFrameworkCore;
using Npgsql;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// "An epic belongs to at most one project" — measured where it is actually enforced.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why the handler test is not enough.</b> <c>Project.EnsureEpicUnassigned</c> reads the
/// current owner and then writes; two concurrent assignments both read "free" and both succeed.
/// The unique index is the only thing that closes that window, and an index is invisible to any
/// test that goes through the handler one call at a time. This class writes straight to the
/// database, which is the only way to ask whether the guarantee is real.
/// </para>
/// <para>
/// <b>The per-tenant scope is asserted as a property, not tolerated as a limitation.</b> A
/// globally unique index would also reject an epic claimed inside another tenant — turning a write
/// conflict into an answer about a row the caller must not know exists. The last test pins that
/// choice so a later "tighten the index" change has to argue with it.
/// </para>
/// </remarks>
public sealed class EpicUniquenessTests : IAsyncLifetime
{
    private readonly NonSuperuserRlsFixture _fixture = new("projects_epic_uniqueness");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private readonly Guid _projectOne = Guid.NewGuid();
    private readonly Guid _projectTwo = Guid.NewGuid();
    private readonly Guid _projectOtherTenant = Guid.NewGuid();

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

            await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
            await InterceptorEndToEndTests.SeedProjectAsync(
                connection, _projectOne, TenantA, "PRJ-2026-020", "First");
            await InterceptorEndToEndTests.SeedProjectAsync(
                connection, _projectTwo, TenantA, "PRJ-2026-021", "Second");
            await InterceptorEndToEndTests.SeedProjectAsync(
                connection, _projectOtherTenant, TenantB, "PRJ-2026-022", "Other tenant");
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private static Task AssignAsync(NpgsqlConnection connection, Guid projectId, Guid tenantId, Guid epicId) =>
        RlsSql.ExecuteAsync(connection, $"""
            INSERT INTO {ProjectsDbContext.SchemaName}."project_epic_assignments"
                ("Id", "ProjectId", "TenantId", "EpicId", "AssignedAtUtc")
            VALUES (@id, @project, @tenant, @epic, now())
            """,
            ("id", Guid.NewGuid()), ("project", projectId), ("tenant", tenantId), ("epic", epicId));

    [Fact]
    public async Task One_epic_cannot_be_claimed_by_two_projects_of_the_same_tenant()
    {
        var epicId = Guid.NewGuid();
        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
        await AssignAsync(connection, _projectOne, TenantA, epicId);

        var failure = await Assert.ThrowsAsync<PostgresException>(() =>
            AssignAsync(connection, _projectTwo, TenantA, epicId));

        // 23505 = unique_violation. Asserted on the code rather than the message so the test does
        // not depend on the server's locale, and so that a DIFFERENT error (a broken FK, say)
        // cannot be mistaken for the guarantee holding.
        Assert.Equal(PostgresErrorCodes.UniqueViolation, failure.SqlState);
    }

    [Fact]
    public async Task The_same_project_cannot_record_one_epic_twice()
    {
        var epicId = Guid.NewGuid();
        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
        await AssignAsync(connection, _projectOne, TenantA, epicId);

        var failure = await Assert.ThrowsAsync<PostgresException>(() =>
            AssignAsync(connection, _projectOne, TenantA, epicId));

        Assert.Equal(PostgresErrorCodes.UniqueViolation, failure.SqlState);
    }

    [Fact]
    public async Task Two_tenants_may_each_claim_the_same_epic_id_and_that_is_deliberate()
    {
        // Not an oversight. A global index would make this insert fail, and the failure would tell
        // tenant B that tenant A holds that epic. Whether one Kernel epic may be claimed twice
        // across tenants is a question for the Kernel, which owns the epic; this module refuses to
        // answer it with an error message.
        var epicId = Guid.NewGuid();
        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);

        await AssignAsync(connection, _projectOne, TenantA, epicId);
        await AssignAsync(connection, _projectOtherTenant, TenantB, epicId);

        var rows = await RlsSql.CountAsync(connection, $"""
            SELECT count(*) FROM {ProjectsDbContext.SchemaName}."project_epic_assignments"
            WHERE "EpicId" = @epic
            """, ("epic", epicId));

        Assert.Equal(2, rows);
    }

    [Fact]
    public async Task Deleting_a_project_takes_its_epic_assignments_with_it()
    {
        var epicId = Guid.NewGuid();
        await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
        await AssignAsync(connection, _projectTwo, TenantA, epicId);

        await RlsSql.ExecuteAsync(connection,
            $"""DELETE FROM {ProjectsDbContext.SchemaName}."projects" WHERE "Id" = @id""",
            ("id", _projectTwo));

        var orphans = await RlsSql.CountAsync(connection, $"""
            SELECT count(*) FROM {ProjectsDbContext.SchemaName}."project_epic_assignments"
            WHERE "ProjectId" = @project
            """, ("project", _projectTwo));

        Assert.Equal(0, orphans);
    }
}
