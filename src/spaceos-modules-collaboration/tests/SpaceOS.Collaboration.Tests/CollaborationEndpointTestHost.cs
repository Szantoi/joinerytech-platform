using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Application.Idempotency;
using SpaceOS.Collaboration.Application.Projections;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Domain;
using SpaceOS.Collaboration.TestSupport;
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
    public const string TenantHeader = HeaderTokenAuthenticationHandler.TenantHeader;
    public const string UserHeader = HeaderTokenAuthenticationHandler.UserHeader;
    public const string ModulesHeader = HeaderTokenAuthenticationHandler.ModulesHeader;

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
        TimeProvider? clock = null,
        IIdempotencyStore? idempotencyStore = null,
        IAgreementViewQueries? viewQueries = null,
        SpaceOS.Collaboration.Application.Adapters.IProjectAdapter? projectAdapter = null)
    {
        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));

                    services.AddAuthentication(HeaderTokenAuthenticationHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, HeaderTokenAuthenticationHandler>(HeaderTokenAuthenticationHandler.SchemeName, _ => { });

                    // ADR-061 tenancy: ITenantContext + the resolution middleware below.
                    services.AddSpaceOsModuleTenancy();

                    services.AddCollaborationApi();

                    // ONE instance across requests (the lambda would otherwise run per scope):
                    // since F5/1 a test POSTs a package and then GETs it in a second request.
                    var workPackages = new SingleWorkPackageRepository(workPackage);
                    services.AddScoped<IAgreementRepository>(_ => new AuthKit.InMemoryAgreementRepository(agreement));
                    services.AddScoped<IWorkPackageRepository>(_ => workPackages);
                    services.AddSingleton<IIdempotencyStore>(idempotencyStore ?? new InMemoryIdempotencyStore());
                    services.AddSingleton<IAgreementViewQueries>(viewQueries ?? new StubAgreementViewQueries());

                    // Fail-closed default (F5/2): an unseeded adapter resolves nothing, so a
                    // create test must SAY which epics its kernel knows.
                    services.AddSingleton(projectAdapter
                        ?? new SpaceOS.Collaboration.Application.Adapters.InMemoryProjectAdapter());

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
                    app.UseCollaborationIdempotency();
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

    /// <summary>
    /// Seed plus whatever the create endpoint adds — kept, so a test can GET what it POSTed.
    /// </summary>
    private sealed class SingleWorkPackageRepository(DelegatedWorkPackage? seed) : IWorkPackageRepository
    {
        private readonly List<DelegatedWorkPackage> _stored = seed is null ? [] : [seed];

        public Task<DelegatedWorkPackage?> GetByIdAsync(Guid workPackageId, CancellationToken cancellationToken = default)
            => Task.FromResult(_stored.FirstOrDefault(package => package.Id == workPackageId));

        public Task AddAsync(DelegatedWorkPackage workPackage, CancellationToken cancellationToken = default)
        {
            _stored.Add(workPackage);
            return Task.CompletedTask;
        }

        public Task<Guid?> GetDelegatedProjectIdAsync(Guid agreementId, CancellationToken cancellationToken = default)
            => Task.FromResult(_stored
                .Where(package => package.AgreementId == agreementId && package.WorkScope is not null)
                .Select(package => (Guid?)package.WorkScope!.ProjectId)
                .FirstOrDefault());

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
            => Task.CompletedTask;
    }
}
