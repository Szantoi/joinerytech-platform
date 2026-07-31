using System.Net;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Collaboration.Api;
using SpaceOS.Collaboration.Application.Adapters;
using SpaceOS.Collaboration.Infrastructure;
using SpaceOS.Collaboration.TestSupport;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.IntegrationTests;

/// <summary>
/// The whole stack at once (B2B-10 F3/5): HTTP → tenancy → guard → EF → PostgreSQL.
/// </summary>
/// <remarks>
/// <para>
/// Everything the endpoint tests replaced with an in-memory double is real here: the DbContext, the
/// shared tenant session interceptor, the RLS policies, the repositories, the durable idempotency
/// store and the read-side queries. Only Keycloak is synthetic, and it produces the same claims a
/// real token would.
/// </para>
/// <para>
/// <b>The connection is the application role</b> — <c>NOSUPERUSER</c>, <c>NOBYPASSRLS</c>. That is
/// what makes these tests able to say anything at all: with a superuser the policies are bypassed
/// and every assertion would pass with them deleted. It also means a successful read here is
/// evidence that the interceptor really set <c>app.current_tenant_id</c> on the request's
/// connection — the fail-closed policies return NO rows when it is unset, so a 200 could not
/// happen if the interceptor were absent.
/// </para>
/// </remarks>
internal sealed class CollaborationEndToEndHost : IAsyncDisposable
{
    private readonly IHost _host;

    public HttpClient Client { get; }

    /// <summary>The stub standing in for the Kernel — inspectable, so token forwarding is assertable.</summary>
    public KernelStubHandler KernelStub { get; }

    private CollaborationEndToEndHost(IHost host, KernelStubHandler kernelStub)
    {
        _host = host;
        KernelStub = kernelStub;
        Client = host.GetTestClient();
    }

    /// <summary>
    /// The Kernel's flow-epic route, at the transport seam (B2B-10 F5/2).
    /// </summary>
    /// <remarks>
    /// <para>
    /// Replaces the typed client's PRIMARY handler only: the real <c>HttpProjectAdapter</c>, the
    /// real options and the real on-behalf-of token source all still run, so an E2E create
    /// exercises the whole outbound path except the socket. Fail-closed like the real thing: no
    /// bearer → 401, unknown epic → 404.
    /// </para>
    /// <para>
    /// ⚠ <b>What this stub can never prove</b> (B2B-10 F5/3, measured against a live Kernel): the
    /// cross-tenant line is held by the KERNEL's own query filter, driven by the forwarded token's
    /// <c>tid</c> — this side has no tenant input at all (the port takes only an epic id). The stub
    /// answers 404 because it was TOLD which epics exist, so if the Kernel's filter ever broke, our
    /// 422 would silently become a 201 and this whole suite would stay green. The negative control
    /// is a Kernel property and the kernel-suite is its real guard; these tests pin only that we
    /// transmit its answer faithfully.
    /// </para>
    /// </remarks>
    public sealed class KernelStubHandler(IReadOnlyCollection<Guid> knownEpics) : HttpMessageHandler
    {
        private readonly List<AuthenticationHeaderValue?> _seenAuthorizations = [];

        /// <summary>The Authorization header of every request the "Kernel" received.</summary>
        public IReadOnlyList<AuthenticationHeaderValue?> SeenAuthorizations => _seenAuthorizations;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            lock (_seenAuthorizations)
            {
                _seenAuthorizations.Add(request.Headers.Authorization);
            }

            if (request.Headers.Authorization is not { Scheme: "Bearer", Parameter.Length: > 0 })
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized));
            }

            var lastSegment = request.RequestUri!.AbsolutePath.TrimEnd('/').Split('/')[^1];

            if (!Guid.TryParse(lastSegment, out var epicId) || !knownEpics.Contains(epicId))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    $$"""{"id":"{{epicId}}","title":"E2E epic","targetFacilityId":"{{Guid.NewGuid()}}","phase":1,"isDelegated":false}""",
                    Encoding.UTF8,
                    "application/json")
            });
        }
    }

    public static async Task<CollaborationEndToEndHost> StartAsync(
        string connectionString, IReadOnlyCollection<Guid>? knownEpics = null)
    {
        var kernelStub = new KernelStubHandler(knownEpics ?? []);

        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    var configuration = new ConfigurationBuilder()
                        .AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["ConnectionStrings:CollaborationDatabase"] = connectionString,
                            // A syntactically real URL the stub swallows; its VALUE being here at
                            // all is what the fail-fast options demand.
                            ["Collaboration:Kernel:BaseUrl"] = "http://kernel.e2e.test"
                        })
                        .Build();

                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));

                    services.AddAuthentication(HeaderTokenAuthenticationHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, HeaderTokenAuthenticationHandler>(
                            HeaderTokenAuthenticationHandler.SchemeName, _ => { });

                    services.AddCollaborationApi();

                    // The production registration, not a test-shaped one: DbContext + interceptor +
                    // repositories + idempotency store + view queries.
                    services.AddCollaborationInfrastructure(configuration);

                    // The production outbound path too (B2B-10 F5/2) — with only its transport
                    // swapped for the stub above.
                    services.AddKernelBackedProjectAdapter(configuration);
                    services.Configure<HttpClientFactoryOptions>(
                        nameof(IProjectAdapter),
                        options => options.HttpMessageHandlerBuilderActions.Add(
                            builder => builder.PrimaryHandler = kernelStub));
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

        return new CollaborationEndToEndHost(host, kernelStub);
    }

    /// <summary>Presents the caller as an authenticated user of the given tenant.</summary>
    /// <remarks>
    /// Also puts a bearer on the request. The synthetic scheme authenticates from its own
    /// headers and ignores it — but the on-behalf-of path (F5/2) reads the REAL
    /// <c>Authorization</c> header to forward, and a request without one is, for that path, a
    /// background call: it fails loudly, by root decree. The first E2E run proved this the hard
    /// way — every create answered 500 until the caller carried a token to forward.
    /// </remarks>
    public CollaborationEndToEndHost As(
        Guid tenantId, Guid userId, string modules = CollaborationApiExtensions.ModuleId)
    {
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.TenantHeader);
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.UserHeader);
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.ModulesHeader);

        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.TenantHeader, tenantId.ToString());
        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.UserHeader, userId.ToString());
        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.ModulesHeader, modules);

        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", $"e2e-token-{tenantId:N}");

        return this;
    }

    /// <summary>A conditional POST, since every transition demands <c>If-Match</c>.</summary>
    public Task<HttpResponseMessage> PostAsync(
        string url, int? ifMatch, HttpContent? content = null, string? idempotencyKey = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };

        if (ifMatch is { } version)
        {
            request.Headers.TryAddWithoutValidation("If-Match", ConditionalRequests.Format(version));
        }

        if (idempotencyKey is not null)
        {
            request.Headers.TryAddWithoutValidation(
                CollaborationIdempotencyMiddleware.KeyHeader, idempotencyKey);
        }

        return Client.SendAsync(request);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }
}
