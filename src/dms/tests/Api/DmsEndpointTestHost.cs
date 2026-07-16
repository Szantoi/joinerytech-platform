using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.DMS.Api;
using SpaceOS.Modules.DMS.Application.Contracts;

namespace SpaceOS.Modules.DMS.Tests.Api;

/// <summary>
/// Lightweight endpoint test host: TestServer + mocked IMediator (no database)
/// — the QA QaEndpointTestHost pattern. Exercises the REST layer contract in
/// isolation: routing, request parsing, exception → HTTP status mapping
/// (200/201/400/404/409) and the MSW-mirror {error, message} bodies.
/// Mirrors the production host JSON setup (AddDmsApiJsonOptions — camelCase
/// enum strings on the wire).
/// </summary>
public sealed class DmsEndpointTestHost : IAsyncDisposable
{
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly IHost _host;
    public HttpClient Client { get; }

    private DmsEndpointTestHost(IHost host)
    {
        _host = host;
        Client = host.GetTestClient();
    }

    public static async Task<DmsEndpointTestHost> StartAsync(
        IMediator mediator,
        Action<IEndpointRouteBuilder> mapEndpoints)
    {
        var host = await new HostBuilder()
            .ConfigureWebHost(webBuilder => webBuilder
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
                    services.AddSingleton(mediator);
                    services.AddSingleton<ITenantContext>(new FixedTenantContext(TenantId));
                    // Production host mirror: camelCase enum strings on the wire
                    services.AddDmsApiJsonOptions();
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseEndpoints(endpoints => mapEndpoints(endpoints));
                }))
            .StartAsync()
            .ConfigureAwait(false);

        return new DmsEndpointTestHost(host);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }

    /// <summary>Fixed tenant for the create endpoint (RLS scoping input).</summary>
    private sealed class FixedTenantContext : ITenantContext
    {
        public FixedTenantContext(Guid tenantId) => TenantId = tenantId;
        public Guid TenantId { get; }
    }
}
