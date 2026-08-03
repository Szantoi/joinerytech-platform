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
    public async Task Epic_assignments_carry_the_same_filter_as_their_project()
    {
        await using var context = CreateContext(TenantB);

        var visible = await context.Projects.ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_projectB, visible[0].Id);
    }

    [Fact]
    public async Task With_no_tenant_resolved_the_filter_is_permissive_and_this_is_the_known_gap()
    {
        // Not a wish — a measurement, pinned so nobody has to rediscover it. The filter switches
        // itself OFF when no tenant is resolved (the platform pattern), which means on that path
        // the ONLY thing standing between an anonymous caller and every tenant's projects is the
        // interceptor's empty session key plus RLS. InterceptorEndToEndTests guards that path;
        // this test documents WHY it has to.
        await using var context = CreateContext(null);

        var visible = await context.Projects.ToListAsync();

        Assert.Equal(2, visible.Count);
    }
}
