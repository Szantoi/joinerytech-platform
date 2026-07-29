using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.Infrastructure;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.RlsFixtures;
using SpaceOS.Modules.Hosting.Tenancy;
using Xunit;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// B2B-10 F2 — the real <c>SpaceOsTenantSessionInterceptor</c>, resolved from the module's own DI
/// registration, actually sets the session key against PostgreSQL.
/// </summary>
/// <remarks>
/// <para>
/// <b>The join nobody was measuring.</b> Two halves of this were already proven separately: the
/// policies behave correctly when the session key is set or cleared
/// (<see cref="CollaborationRlsProofTests"/>), and the interceptor is attached to the context
/// (<c>InfrastructureRegistrationTests</c>). Neither says the interceptor <i>sets the key
/// correctly</i> — every RLS suite on this platform, this module's included, sets it by hand
/// through <see cref="NonSuperuserRlsFixture.SetTenantAsync"/>, which the fixture itself
/// documents as "mirroring" the interceptor. A mirror stays green when the original breaks.
/// </para>
/// <para>
/// So this test goes through <c>AddCollaborationInfrastructure</c> — the same call a host makes —
/// and lets the interceptor do the work. It connects as the non-superuser application role,
/// because a superuser would see every row whether or not the key was ever set.
/// </para>
/// <para>
/// The queries use <c>IgnoreQueryFilters()</c> deliberately. The module's EF filters would produce
/// the right answer on their own, and that would mask a silent interceptor: the point here is what
/// the <i>database</i> returns, so the second layer is switched off to leave RLS alone in the
/// frame. B2B-02's rule against a general <c>IgnoreQueryFilters</c> is about production query
/// paths; using it to isolate the layer under test is the opposite of evading the boundary.
/// </para>
/// </remarks>
public sealed class InterceptorEndToEndTests : IAsyncLifetime
{
    private sealed class FixedTenantContext(Guid? tenantId) : ITenantContext
    {
        public bool HasTenant => tenantId.HasValue;
        public Guid TenantId => tenantId ?? throw new InvalidOperationException("No tenant in scope.");
    }

    private readonly NonSuperuserRlsFixture _fixture = new("collaboration_interceptor_e2e");
    private readonly Guid _host = Guid.NewGuid();
    private readonly Guid _guest = Guid.NewGuid();
    private readonly Guid _stranger = Guid.NewGuid();
    private Guid _sharedAgreementId;

    public async Task InitializeAsync()
    {
        await _fixture.StartAsync();

        await using (var db = new CollaborationDbContext(
            new DbContextOptionsBuilder<CollaborationDbContext>()
                .UseNpgsql(_fixture.AdminConnectionString).Options))
        {
            await db.Database.MigrateAsync();

            var shared = CollaborationAgreement.Create(_host, _guest, "Shared", DateTimeOffset.UtcNow);
            var foreign = CollaborationAgreement.Create(_stranger, Guid.NewGuid(), "Foreign", DateTimeOffset.UtcNow);
            db.Agreements.AddRange(shared, foreign);
            await db.SaveChangesAsync();
            _sharedAgreementId = shared.Id;
        }

        await _fixture.CreateApplicationRoleAsync("public");
    }

    public async Task DisposeAsync() => await _fixture.DisposeAsync();

    /// <summary>Builds the container exactly as a host would, then swaps in a fixed tenant.</summary>
    private ServiceProvider BuildHostLikeProvider(Guid? tenantId)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{CollaborationInfrastructureServiceCollectionExtensions.ConnectionStringName}"] =
                    _fixture.AppConnectionString(),
            })
            .Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCollaborationInfrastructure(configuration);

        // Registered last so it replaces the claims-backed context the tenancy baseline adds.
        services.AddScoped<ITenantContext>(_ => new FixedTenantContext(tenantId));

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task The_interceptor_sets_the_session_key_so_a_participant_sees_its_agreement()
    {
        using var provider = BuildHostLikeProvider(_host);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();

        var visible = await db.Agreements.IgnoreQueryFilters().ToListAsync();

        Assert.Single(visible);
        Assert.Equal(_sharedAgreementId, visible[0].Id);
    }

    [Fact]
    public async Task A_tenant_that_participates_in_nothing_is_shown_nothing()
    {
        using var provider = BuildHostLikeProvider(Guid.NewGuid());
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();

        Assert.Empty(await db.Agreements.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task With_no_tenant_resolved_the_interceptor_writes_the_empty_key_and_the_query_is_fail_closed()
    {
        // The path taken by startup migrations, health pings and anonymous endpoints. It must be
        // an empty result, not the cast error the pre-F2 policies would have produced.
        using var provider = BuildHostLikeProvider(null);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();

        Assert.Empty(await db.Agreements.IgnoreQueryFilters().ToListAsync());
    }

    [Fact]
    public async Task Two_scopes_on_one_provider_do_not_leak_a_tenant_through_the_connection_pool()
    {
        // Both scopes come from providers sharing one Npgsql pool (same connection string), so the
        // physical connection is reused. If the interceptor's ConnectionClosing reset were dropped,
        // the second scope would inherit the first tenant's key.
        using var participant = BuildHostLikeProvider(_host);
        using (var scope = participant.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();
            Assert.NotEmpty(await db.Agreements.IgnoreQueryFilters().ToListAsync());
        }

        using var outsider = BuildHostLikeProvider(_stranger);
        using (var scope = outsider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();

            // The stranger hosts the "Foreign" agreement, so a leak would show the SHARED one too.
            var visible = await db.Agreements.IgnoreQueryFilters().ToListAsync();
            Assert.DoesNotContain(visible, a => a.Id == _sharedAgreementId);
        }
    }

    [Fact]
    public async Task The_session_key_the_interceptor_writes_is_the_one_the_policies_read()
    {
        // Asserted on the value itself rather than only on its effect: if the key name ever
        // diverged from the policies' key, every test above would still pass by both sides being
        // empty, and the module would fail closed forever without anyone noticing.
        using var provider = BuildHostLikeProvider(_host);
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CollaborationDbContext>();

        await db.Database.OpenConnectionAsync();
        try
        {
            var connection = (NpgsqlConnection)db.Database.GetDbConnection();
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT current_setting('app.current_tenant_id', true)";

            Assert.Equal(_host.ToString(), (string?)await command.ExecuteScalarAsync());
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
