using System.Security.Claims;
using System.Text.Encodings.Web;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
                    // The endpoint groups are RequireAuthorization-gated (ADR-061):
                    // an always-authenticated test scheme with a real "tid" claim
                    // matching the fixed tenant (QA QaEndpointTestHost precedent)
                    services.AddAuthentication(TestAuthHandler.Scheme)
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
                    services.AddAuthorization();
                    services.AddSingleton(mediator);
                    services.AddSingleton<ITenantContext>(new FixedTenantContext(TenantId));
                    // Production host mirror: camelCase enum strings on the wire
                    services.AddDmsApiJsonOptions();
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
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

/// <summary>
/// Always-authenticated test scheme so RequireAuthorization() passes; carries a
/// real "tid" claim (ADR-061) matching <see cref="DmsEndpointTestHost.TenantId"/>.
/// </summary>
public sealed class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public new const string Scheme = "Test";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "test-user"),
                new Claim("tid", DmsEndpointTestHost.TenantId.ToString()),
            }, Scheme);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
