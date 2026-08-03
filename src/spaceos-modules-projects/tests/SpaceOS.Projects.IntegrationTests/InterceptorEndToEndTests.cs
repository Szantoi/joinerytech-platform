using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Projects.Infrastructure;
using SpaceOS.Projects.Infrastructure.Data;
using Xunit;

namespace SpaceOS.Projects.IntegrationTests;

/// <summary>
/// The real <c>SpaceOsTenantSessionInterceptor</c>, resolved from this module's own
/// <see cref="ProjectsInfrastructureServiceCollectionExtensions.AddProjectsPersistence"/>
/// registration, sets the RLS session key against PostgreSQL.
/// </summary>
/// <remarks>
/// <para>
/// <b>Why this is not the RLS suite over again.</b> <see cref="RlsNonSuperuserIsolationTests"/>
/// proves the policies, but it sets the session key BY HAND through the fixture — a mirror of the
/// interceptor, and a mirror stays green when the original breaks. This class builds the container
/// the way a host does and lets the interceptor do the work. The CRM pilot measured the difference
/// directly: removing the interceptor from DI failed exactly the key-setting tests while the
/// hand-mirrored suite stayed entirely green.
/// </para>
/// <para>
/// <b>What the no-tenant test guards, stated plainly.</b> This module's EF query filter is
/// permissive when no tenant is resolved (<c>CurrentTenantId == null</c> switches it off — the
/// platform pattern). On that path the fail-closed property rests ENTIRELY on the interceptor
/// writing the empty key and the <c>NULLIF(..., '')</c> policies returning nothing. There is no
/// second layer behind it. The queries below use <c>IgnoreQueryFilters()</c> to keep the database
/// alone in the frame.
/// </para>
/// </remarks>
public sealed class InterceptorEndToEndTests : IAsyncLifetime
{
    private sealed class FixedTenantContext(Guid? tenantId) : ITenantContext
    {
        public bool HasTenant => tenantId.HasValue;
        public Guid TenantId => tenantId ?? throw new InvalidOperationException("No tenant in scope.");
    }

    private readonly NonSuperuserRlsFixture _fixture = new("projects_interceptor_e2e");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private Guid _tenantAProjectId;

    public async Task InitializeAsync()
    {
        try
        {
            await _fixture.StartAsync();

            var options = new DbContextOptionsBuilder<ProjectsDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString)
                .Options;
            await using (var migrationContext = new ProjectsDbContext(options))
            {
                await migrationContext.Database.MigrateAsync();
            }

            // One project per tenant, so every visibility assertion has both a positive and a
            // negative row to distinguish. Seeded as the admin: the table owner would be subject
            // to FORCE RLS, the superuser is not.
            _tenantAProjectId = Guid.NewGuid();
            await using (var connection = await RlsSql.OpenAsync(_fixture.AdminConnectionString))
            {
                await SeedProjectAsync(connection, _tenantAProjectId, TenantA, "PRJ-2026-001", "Tenant A job");
                await SeedProjectAsync(connection, Guid.NewGuid(), TenantB, "PRJ-2026-002", "Tenant B job");
            }

            await _fixture.CreateApplicationRoleAsync(ProjectsDbContext.SchemaName);
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    internal static Task SeedProjectAsync(
        NpgsqlConnection connection, Guid id, Guid tenantId, string code, string name) =>
        RlsSql.ExecuteAsync(connection, $"""
            INSERT INTO {ProjectsDbContext.SchemaName}."projects"
                ("Id", "TenantId", "Code", "Name", "Status", "CreatedAtUtc", "RowVersion")
            VALUES (@id, @tenant, @code, @name, 1, now(), 1)
            """,
            ("id", id), ("tenant", tenantId), ("code", code), ("name", name));

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    /// <summary>Builds the container exactly as a host would, then swaps in a fixed tenant.</summary>
    private ServiceProvider BuildHostLikeProvider(Guid? tenantId)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{ProjectsInfrastructureServiceCollectionExtensions.ConnectionStringName}"] =
                    _fixture.AppConnectionString(),
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddProjectsPersistence(configuration);

        // Registered last so it replaces the claims-backed context the tenancy baseline adds.
        services.AddScoped<ITenantContext>(_ => new FixedTenantContext(tenantId));

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task The_interceptor_sets_the_session_key_so_a_tenant_sees_exactly_its_own_project()
    {
        using var provider = BuildHostLikeProvider(TenantA);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();

        var visible = await db.Projects.IgnoreQueryFilters().ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_tenantAProjectId, visible[0].Id);
    }

    [Fact]
    public async Task A_tenant_with_no_rows_is_shown_nothing()
    {
        using var provider = BuildHostLikeProvider(Guid.NewGuid());
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();

        Assert.Empty(await db.Projects.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task With_no_tenant_resolved_the_query_is_fail_closed_even_though_the_EF_filter_is_permissive()
    {
        // The module's own filter DISABLES itself when no tenant is resolved, so on this path the
        // empty result can only come from the interceptor writing the empty session key and RLS
        // holding the line. If this test ever turns red, the no-tenant path (startup, health,
        // anonymous endpoints) is exposing every tenant's projects at once — nothing is behind it.
        using var provider = BuildHostLikeProvider(null);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();

        Assert.Empty(await db.Projects.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task Two_scopes_on_one_pool_do_not_leak_a_tenant_through_connection_reuse()
    {
        // Both providers share one Npgsql pool (same connection string), so the physical
        // connection is reused. If the interceptor's ConnectionClosing reset were dropped, the
        // second scope would inherit tenant A's key and see its project.
        using var participant = BuildHostLikeProvider(TenantA);
        using (var scope = participant.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();
            Assert.NotEmpty(await db.Projects.IgnoreQueryFilters().ToListAsync());
        }

        using var outsider = BuildHostLikeProvider(TenantB);
        using (var scope = outsider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();

            var visible = await db.Projects.IgnoreQueryFilters().ToListAsync();
            Assert.DoesNotContain(visible, project => project.Id == _tenantAProjectId);
        }
    }

    [Fact]
    public async Task The_session_key_the_interceptor_writes_is_the_one_the_policies_read()
    {
        // Asserted on the value itself rather than only on its effect: if the key name ever
        // diverged from the policies' key, every test above would still pass by both sides being
        // empty, and the module would fail closed forever without anyone noticing.
        using var provider = BuildHostLikeProvider(TenantA);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProjectsDbContext>();

        await db.Database.OpenConnectionAsync();
        try
        {
            var connection = (NpgsqlConnection)db.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT current_setting('app.current_tenant_id', true)";

            Assert.Equal(TenantA.ToString(), (string?)await command.ExecuteScalarAsync());
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
