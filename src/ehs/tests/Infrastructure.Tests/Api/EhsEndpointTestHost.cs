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
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Tests.Api;

/// <summary>
/// Lightweight authenticated endpoint host. It exercises routing, query
/// binding and HTTP results with a mocked mediator; no database or Docker.
/// </summary>
public sealed class EhsEndpointTestHost : IAsyncDisposable
{
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-4111-8111-111111111111");

    private readonly IHost _host;
    public HttpClient Client { get; }

    private EhsEndpointTestHost(IHost host)
    {
        _host = host;
        Client = host.GetTestClient();
    }

    public static async Task<EhsEndpointTestHost> StartAsync(
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
                    services.AddAuthentication(EhsTestAuthHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, EhsTestAuthHandler>(
                            EhsTestAuthHandler.SchemeName,
                            static _ => { });
                    services.AddAuthorization();
                    services.AddSingleton(mediator);
                    services.AddSingleton<ITenantContext>(new FixedTenantContext(TenantId));
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

        return new EhsEndpointTestHost(host);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }

    private sealed record FixedTenantContext(Guid TenantId) : ITenantContext;
}

internal sealed class EhsTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    internal const string SchemeName = "EhsEndpointTest";

    public EhsTestAuthHandler(
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
                new Claim(ClaimTypes.NameIdentifier, "ehs-endpoint-test-user"),
                new Claim("tid", EhsEndpointTestHost.TenantId.ToString()),
            },
            SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
