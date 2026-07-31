using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SpaceOS.Modules.CRM.Infrastructure;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Modules.CRM.Tests.Integration;

/// <summary>
/// The real <c>SpaceOsTenantSessionInterceptor</c>, resolved from CRM's own DI registration
/// (<see cref="DependencyInjection.AddCrmPersistence"/>), actually sets the RLS session key
/// against PostgreSQL — the collaboration module's interceptor-E2E pattern applied to CRM
/// (platform task, CRM pilot).
/// </summary>
/// <remarks>
/// <para>
/// <see cref="RlsNonSuperuserIsolationTests"/> proves the policies against a genuine
/// non-superuser role, but it sets the session key BY HAND through
/// <see cref="NonSuperuserRlsFixture.SetTenantAsync"/> — a mirror of the interceptor, and a
/// mirror stays green when the original breaks. This class goes through the same
/// <c>AddCrmPersistence</c> call a host makes and lets the interceptor do the work.
/// </para>
/// <para>
/// <b>Why this matters MORE for CRM than it did for collaboration:</b> CRM's EF query filter
/// is permissive when no tenant is resolved (<c>CurrentTenantId == null</c> switches the
/// filter OFF — the kernel pattern), so on the no-tenant path the fail-closed property rests
/// ENTIRELY on the interceptor writing the empty key and RLS returning nothing. The queries
/// below use <c>IgnoreQueryFilters()</c> to keep RLS alone in the frame; the no-tenant test is
/// the one that guards a hole no other layer covers.
/// </para>
/// </remarks>
public sealed class InterceptorEndToEndTests : IAsyncLifetime
{
    private sealed class FixedTenantContext(Guid? tenantId) : ITenantContext
    {
        public bool HasTenant => tenantId.HasValue;
        public Guid TenantId => tenantId ?? throw new InvalidOperationException("No tenant in scope.");
    }

    private readonly NonSuperuserRlsFixture _fixture = new("crm_interceptor_e2e");
    private static readonly Guid TenantA = Guid.NewGuid();
    private static readonly Guid TenantB = Guid.NewGuid();
    private Guid _tenantALeadId;

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

            // Seeded as the admin (table owner would be forced by RLS, the superuser is not),
            // one lead per tenant, so every visibility assertion below has a positive and a
            // negative row to distinguish.
            _tenantALeadId = Guid.NewGuid();
            await using (var conn = await RlsSql.OpenAsync(_fixture.AdminConnectionString))
            {
                await RlsSql.ExecuteAsync(conn, """
                    INSERT INTO crm."leads"
                        ("Id", "Status", contact_name, contact_email, "Source", "AssignedTo",
                         "CreatedAt", "CreatedBy", "TenantId")
                    VALUES (@id, 'New', 'Interceptor Elek', 'interceptor.elek@example.test', 'Website',
                            @assignedTo, now(), @createdBy, @tenant)
                    """,
                    ("id", _tenantALeadId), ("assignedTo", Guid.NewGuid()),
                    ("createdBy", Guid.NewGuid()), ("tenant", TenantA));

                await RlsSql.ExecuteAsync(conn, """
                    INSERT INTO crm."leads"
                        ("Id", "Status", contact_name, contact_email, "Source", "AssignedTo",
                         "CreatedAt", "CreatedBy", "TenantId")
                    VALUES (@id, 'New', 'Idegen Ilona', 'idegen.ilona@example.test', 'Referral',
                            @assignedTo, now(), @createdBy, @tenant)
                    """,
                    ("id", Guid.NewGuid()), ("assignedTo", Guid.NewGuid()),
                    ("createdBy", Guid.NewGuid()), ("tenant", TenantB));
            }

            await _fixture.CreateApplicationRoleAsync(CrmDbContext.SchemaName);
        }
        catch
        {
            await _fixture.DisposeAsync();
            throw;
        }
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    /// <summary>Builds the container exactly as a host would, then swaps in a fixed tenant.</summary>
    private ServiceProvider BuildHostLikeProvider(Guid? tenantId)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{DependencyInjection.ConnectionStringName}"] =
                    _fixture.AppConnectionString(),
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCrmPersistence(configuration);

        // Registered last so it replaces the claims-backed context the tenancy baseline adds.
        services.AddScoped<ITenantContext>(_ => new FixedTenantContext(tenantId));

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task The_interceptor_sets_the_session_key_so_a_tenant_sees_exactly_its_own_lead()
    {
        using var provider = BuildHostLikeProvider(TenantA);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

        var visible = await db.Leads.IgnoreQueryFilters().ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_tenantALeadId, visible[0].Id);
    }

    [Fact]
    public async Task A_tenant_with_no_rows_is_shown_nothing()
    {
        using var provider = BuildHostLikeProvider(Guid.NewGuid());
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

        Assert.Empty(await db.Leads.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task With_no_tenant_resolved_the_query_is_fail_closed_even_though_the_EF_filter_is_permissive()
    {
        // CRM's own query filter DISABLES itself when no tenant is resolved (kernel pattern),
        // so on this path the empty result can only come from the interceptor writing the
        // empty session key and RLS holding the line. If this test ever turns red, the
        // no-tenant path (startup, health, anonymous endpoints) is exposing every tenant's
        // leads at once — there is no second layer behind it.
        using var provider = BuildHostLikeProvider(null);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

        Assert.Empty(await db.Leads.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task Two_scopes_on_one_pool_do_not_leak_a_tenant_through_connection_reuse()
    {
        // Both providers share one Npgsql pool (same connection string), so the physical
        // connection is reused. If the interceptor's ConnectionClosing reset were dropped,
        // the second scope would inherit tenant A's key and see its lead.
        using var participant = BuildHostLikeProvider(TenantA);
        using (var scope = participant.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();
            Assert.NotEmpty(await db.Leads.IgnoreQueryFilters().ToListAsync());
        }

        using var outsider = BuildHostLikeProvider(TenantB);
        using (var scope = outsider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

            // Tenant B owns the "Idegen Ilona" lead, so a leak would show tenant A's row too.
            var visible = await db.Leads.IgnoreQueryFilters().ToListAsync();
            Assert.DoesNotContain(visible, l => l.Id == _tenantALeadId);
        }
    }

    [Fact]
    public async Task The_session_key_the_interceptor_writes_is_the_one_the_policies_read()
    {
        // Asserted on the value itself rather than only on its effect: if the key name ever
        // diverged from the policies' key, every test above would still pass by both sides
        // being empty, and the module would fail closed forever without anyone noticing.
        using var provider = BuildHostLikeProvider(TenantA);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CrmDbContext>();

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
