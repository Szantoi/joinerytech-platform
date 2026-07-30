using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Tests;

/// <summary>
/// A TestServer running the REAL collaboration pipeline (B2B-10 F3/2).
/// </summary>
/// <remarks>
/// <para>
/// The one thing this host does not use is a database — the repositories are in-memory. Everything
/// else is production wiring: the real tenancy middleware (so the <c>X-Tenant-Id</c> allowlist rule
/// is actually exercised), the real module gate, the real caller context, the real guard, the real
/// handlers, and the real ProblemDetails mapping.
/// </para>
/// <para>
/// The precedent in this repo (HR/QA endpoint hosts) mocks <c>IMediator</c> and so measures routing
/// only. That would have been useless here: the entire point of F3 is what happens BETWEEN the
/// route and the aggregate.
/// </para>
/// </remarks>
internal sealed class CollaborationEndpointTestHost : IAsyncDisposable
{
    /// <summary>Test-only headers the synthetic token is built from.</summary>
    public const string TenantHeader = "X-Test-Tenant";
    public const string UserHeader = "X-Test-User";
    public const string ModulesHeader = "X-Test-Modules";

    private readonly IHost _host;

    public HttpClient Client { get; }

    /// <summary>Every endpoint the host mapped — for looking at gates instead of inferring them.</summary>
    public IReadOnlyList<Microsoft.AspNetCore.Http.Endpoint> Endpoints =>
        _host.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>().Endpoints;

    private CollaborationEndpointTestHost(IHost host)
    {
        _host = host;
        Client = host.GetTestClient();
    }

    public static async Task<CollaborationEndpointTestHost> StartAsync(
        CollaborationAgreement? agreement = null,
        DelegatedWorkPackage? workPackage = null,
        TimeProvider? clock = null)
    {
        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));

                    services.AddAuthentication(HeaderTokenHandler.Scheme)
                        .AddScheme<AuthenticationSchemeOptions, HeaderTokenHandler>(HeaderTokenHandler.Scheme, _ => { });

                    // ADR-061 tenancy: ITenantContext + the resolution middleware below.
                    services.AddSpaceOsModuleTenancy();

                    services.AddCollaborationApi();

                    services.AddScoped<IAgreementRepository>(_ => new AuthKit.InMemoryAgreementRepository(agreement));
                    services.AddScoped<IWorkPackageRepository>(_ => new SingleWorkPackageRepository(workPackage));

                    if (clock is not null)
                    {
                        services.AddSingleton(clock);
                    }
                })
                .Configure(app =>
                {
                    app.UseExceptionHandler();
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseSpaceOsModuleTenancy();
                    app.UseEndpoints(endpoints => endpoints.MapCollaborationEndpoints());
                }))
            .StartAsync()
            .ConfigureAwait(false);

        return new CollaborationEndpointTestHost(host);
    }

    /// <summary>Presents the caller as an authenticated user of the given tenant.</summary>
    public CollaborationEndpointTestHost As(Guid tenantId, Guid userId, string modules = CollaborationApiExtensions.ModuleId)
    {
        Client.DefaultRequestHeaders.Remove(TenantHeader);
        Client.DefaultRequestHeaders.Remove(UserHeader);
        Client.DefaultRequestHeaders.Remove(ModulesHeader);

        Client.DefaultRequestHeaders.Add(TenantHeader, tenantId.ToString());
        Client.DefaultRequestHeaders.Add(UserHeader, userId.ToString());
        Client.DefaultRequestHeaders.Add(ModulesHeader, modules);

        return this;
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }

    private sealed class SingleWorkPackageRepository(DelegatedWorkPackage? seed) : IWorkPackageRepository
    {
        public Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default)
            => Task.FromResult(seed?.Id == workPackageId ? seed : null);

        public Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }

    /// <summary>
    /// Stands in for Keycloak: turns the test headers into the same CLAIMS a real token carries.
    /// </summary>
    /// <remarks>
    /// Deliberately produces the claim shapes the hosting package parses (<c>tid</c>, <c>sub</c> and
    /// the <c>spaceos_tenants</c> JSON array with <c>enabled_modules</c>) rather than short-cutting
    /// to a resolved tenant. The tenant resolution and the module gate are part of what these tests
    /// are here to measure.
    /// </remarks>
    private sealed class HeaderTokenHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        public const string Scheme = "CollaborationTestScheme";

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue(TenantHeader, out var tenant)
                || !Request.Headers.TryGetValue(UserHeader, out var user))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var modules = Request.Headers.TryGetValue(ModulesHeader, out var raw) && !string.IsNullOrWhiteSpace(raw)
                ? raw.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                : [];

            var tenantList = System.Text.Json.JsonSerializer.Serialize(new[]
            {
                new Dictionary<string, object>
                {
                    ["tenant_id"] = tenant.ToString(),
                    ["enabled_modules"] = modules
                }
            });

            var identity = new ClaimsIdentity(
                [
                    new Claim(TenancyDefaults.TenantIdClaim, tenant.ToString()),
                    new Claim("sub", user.ToString()),
                    new Claim(TenancyDefaults.TenantListClaim, tenantList, "JSON")
                ],
                Scheme);

            return Task.FromResult(AuthenticateResult.Success(
                new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme)));
        }
    }
}
