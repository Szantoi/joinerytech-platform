using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpaceOS.Collaboration.Api;
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

    private CollaborationEndToEndHost(IHost host)
    {
        _host = host;
        Client = host.GetTestClient();
    }

    public static async Task<CollaborationEndToEndHost> StartAsync(string connectionString)
    {
        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    var configuration = new ConfigurationBuilder()
                        .AddInMemoryCollection(new Dictionary<string, string?>
                        {
                            ["ConnectionStrings:CollaborationDatabase"] = connectionString
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

        return new CollaborationEndToEndHost(host);
    }

    /// <summary>Presents the caller as an authenticated user of the given tenant.</summary>
    public CollaborationEndToEndHost As(
        Guid tenantId, Guid userId, string modules = CollaborationApiExtensions.ModuleId)
    {
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.TenantHeader);
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.UserHeader);
        Client.DefaultRequestHeaders.Remove(HeaderTokenAuthenticationHandler.ModulesHeader);

        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.TenantHeader, tenantId.ToString());
        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.UserHeader, userId.ToString());
        Client.DefaultRequestHeaders.Add(HeaderTokenAuthenticationHandler.ModulesHeader, modules);

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
