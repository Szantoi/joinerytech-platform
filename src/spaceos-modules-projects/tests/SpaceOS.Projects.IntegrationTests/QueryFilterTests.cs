using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// The EF query filter — the second layer — measured <b>alone</b>, with RLS deliberately out of
/// the frame.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this class has to exist separately.</b> Every other test here connects as the
/// non-superuser role, where RLS enforces isolation on its own; and the interceptor suite calls
/// <c>IgnoreQueryFilters()</c> precisely to keep the database alone in view. Between them, the
/// query filter is covered by nothing: delete it and the whole suite stays green, because the
/// layer underneath silently does its job. That is the shape a missing layer always has — it is
/// invisible in behaviour until the layer that was covering it also fails.
/// </para>
/// <para>
/// The trick that isolates it: connect as the <b>admin</b> (superuser) role, which PostgreSQL
/// exempts from RLS unconditionally. Whatever filtering survives is EF's, and nothing else.
/// The first test proves the isolation is real by showing both tenants' rows through
/// <c>IgnoreQueryFilters()</c> — without that control, an empty result could just as easily mean
/// the seed failed.
/// </para>
/// </remarks>
public sealed class QueryFilterTests : IAsyncLifetime
{
    private sealed class FixedTenantContext(Guid? tenantId) : ITenantContext
    {
        public bool HasTenant => tenantId.HasValue;
        public Guid TenantId => tenantId ?? throw new InvalidOperationException("No tenant in scope.");
    }

    private readonly NonSuperuserRlsFixture _fixture = new("projects_query_filter");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private readonly Guid _projectA = Guid.NewGuid();
    private readonly Guid _projectB = Guid.NewGuid();
    private readonly Guid _epicA = Guid.NewGuid();

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            await using (var context = new ProjectsDbContext(ContextOptions()))
            {
                await context.Database.MigrateAsync();
            }

            await using var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString);
            await InterceptorEndToEndTests.SeedProjectAsync(
                connection, _projectA, TenantA, "PRJ-2026-030", "Tenant A job");
            await InterceptorEndToEndTests.SeedProjectAsync(
                connection, _projectB, TenantB, "PRJ-2026-031", "Tenant B job");

            await RlsSql.ExecuteAsync(connection, $"""
                INSERT INTO {ProjectsDbContext.SchemaName}."project_epic_assignments"
                    ("Id", "ProjectId", "TenantId", "EpicId", "AssignedAtUtc")
                VALUES (@id, @project, @tenant, @epic, now())
                """,
                ("id", Guid.NewGuid()), ("project", _projectA),
                ("tenant", TenantA), ("epic", _epicA));

            await RlsSql.ExecuteAsync(connection, $"""
                INSERT INTO {ProjectsDbContext.SchemaName}."project_code_counters"
                    ("TenantId", "Year", "LastValue")
                VALUES (@tenantA, 2026, 30), (@tenantB, 2026, 31)
                """,
                ("tenantA", TenantA), ("tenantB", TenantB));

            await RlsSql.ExecuteAsync(connection, $"""
                INSERT INTO {ProjectsDbContext.SchemaName}."project_idempotency_records"
                    ("Id", "TenantId", "Key", "Fingerprint", "ClaimedAtUtc")
                VALUES (@idA, @tenantA, 'key-a', 'fp-a', now()),
                       (@idB, @tenantB, 'key-b', 'fp-b', now())
                """,
                ("idA", Guid.NewGuid()), ("tenantA", TenantA),
                ("idB", Guid.NewGuid()), ("tenantB", TenantB));
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    private DbContextOptions<ProjectsDbContext> ContextOptions() =>
        new DbContextOptionsBuilder<ProjectsDbContext>()
            .UseNpgsql(_fixture.AdminConnectionString)
            .Options;

    /// <summary>
    /// Admin connection on purpose — superusers bypass RLS, leaving only the EF filter. A null
    /// tenant goes through the same constructor as a real one, because "resolved to nothing" is
    /// the state a host actually reaches (startup, health, anonymous) and the one the last test
    /// measures.
    /// </summary>
    private ProjectsDbContext CreateContext(Guid? tenantId) =>
        new(ContextOptions(), new FixedTenantContext(tenantId));

    [Fact]
    public async Task Control_the_database_really_does_show_both_rows_to_this_connection()
    {
        // The positive control. If RLS were somehow still biting here, the isolation test below
        // would pass for the wrong reason and prove nothing about the query filter.
        await using var context = CreateContext(TenantA);

        var all = await context.Projects.IgnoreQueryFilters().ToListAsync();

        Assert.Contains(all, project => project.Id == _projectA);
        Assert.Contains(all, project => project.Id == _projectB);
    }

    [Fact]
    public async Task With_RLS_bypassed_the_query_filter_alone_still_hides_the_other_tenant()
    {
        await using var context = CreateContext(TenantA);

        var visible = await context.Projects.ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_projectA, visible[0].Id);
    }

    [Fact]
    public async Task The_other_tenants_context_sees_only_its_own_project()
    {
        await using var context = CreateContext(TenantB);

        var visible = await context.Projects.ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_projectB, visible[0].Id);
    }

    [Fact]
    public async Task Epic_assignments_carry_their_own_filter_not_an_inherited_one()
    {
        // Queried directly, not through the project navigation: the assignment's filter compares
        // its OWN TenantId column, and only a direct query proves that column's filter exists.
        // (An earlier shape of this test queried Projects under this name and measured nothing
        // about assignments — 2026-08-05.)
        await using var contextA = CreateContext(TenantA);
        await using var contextB = CreateContext(TenantB);

        var mine = await contextA.Set<Domain.ProjectEpicAssignment>().ToListAsync();
        var theirs = await contextB.Set<Domain.ProjectEpicAssignment>().ToListAsync();

        Assert.Single(mine);
        Assert.Equal(_epicA, mine[0].EpicId);
        Assert.Empty(theirs);
    }

    [Fact]
    public async Task Code_counters_are_tenant_data_and_carry_the_filter_too()
    {
        // How many projects a tenant opened this year is its business and nobody else's — and the
        // gate that once forgot this table is exactly why it is asserted here by name
        // (root M-ROOT, 2026-08-04: the counters table fell out of a hand-maintained list).
        await using var context = CreateContext(TenantA);

        var visible = await context.Set<ProjectCodeCounter>().ToListAsync();

        var counter = Assert.Single(visible);
        Assert.Equal(TenantA, counter.TenantId);
    }

    [Fact]
    public async Task Idempotency_records_replay_bodies_and_carry_the_filter_too()
    {
        // A recorded response body is tenant data — another tenant reading it would read answers
        // that are not its own. Witnessed HERE, the day the entity is born, so the filter never
        // exists uncovered (the exact gap the assignments filter sat in until 2026-08-05).
        await using var context = CreateContext(TenantB);

        var visible = await context.Set<ProjectIdempotencyRecord>().ToListAsync();

        var record = Assert.Single(visible);
        Assert.Equal(TenantB, record.TenantId);
    }

    [Fact]
    public async Task With_no_tenant_resolved_the_filter_is_permissive_and_this_is_the_known_gap()
    {
        // DECISION RECORD, not a defect report — this test pins a deliberately accepted state.
        //
        // The filter switches itself OFF when no tenant is resolved. That is the platform pattern
        // (CRM, collaboration, kernel): startup, migrations and design-time tooling run without a
        // tenant and must see the model. On that path the ONLY thing standing between an anonymous
        // caller and every tenant's projects is the interceptor's empty session key plus RLS —
        // InterceptorEndToEndTests guards that layer; this test documents WHY it has to.
        //
        // If you came here because this assertion went red after making the filter fail-closed:
        // that is not a regression to restore — it is this decision being revisited. Lifting it
        // requires (a) a platform-level decision that no-tenant contexts deny by default, applied
        // to every module, and (b) a startup/migration path that still works without a tenant.
        // Then INVERT this assertion; do not restore the permissive behaviour to keep it green.
        await using var context = CreateContext(null);

        var visible = await context.Projects.ToListAsync();

        Assert.Equal(2, visible.Count);
    }
}
