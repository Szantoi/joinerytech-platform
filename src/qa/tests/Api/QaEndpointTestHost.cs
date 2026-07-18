using System.Security.Claims;
using System.Text.Encodings.Web;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SpaceOS.Modules.QA.Tests.Api;

/// <summary>
/// Lightweight endpoint test host: TestServer + mocked IMediator (no database).
/// Exercises the REST layer contract in isolation — routing, request parsing,
/// Ardalis.Result → HTTP status mapping (200/201/400/404/409) and DTO bodies.
/// Mirrors the production host JSON setup (JsonStringEnumConverter — EHS
/// Program.cs precedent: enums travel as strings on the wire).
/// </summary>
public sealed class QaEndpointTestHost : IAsyncDisposable
{
    public const string TenantHeader = "X-Tenant-Id";
    public static readonly Guid TenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private readonly IHost _host;
    public HttpClient Client { get; }

    private QaEndpointTestHost(IHost host)
    {
        _host = host;
        Client = host.GetTestClient();
        Client.DefaultRequestHeaders.Add(TenantHeader, TenantId.ToString());
    }

    public static async Task<QaEndpointTestHost> StartAsync(
        IMediator mediator,
        Action<IEndpointRouteBuilder> mapEndpoints,
        Dictionary<string, string?>? configuration = null)
    {
        var host = await new HostBuilder()
            .ConfigureAppConfiguration(config =>
                config.AddInMemoryCollection(configuration ?? new Dictionary<string, string?>()))
            .ConfigureWebHost(webBuilder => webBuilder
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
                    services.AddAuthentication(TestAuthHandler.Scheme)
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Scheme, _ => { });
                    services.AddAuthorization();
                    services.AddSingleton(mediator);
                    // Production host mirror: enums as strings on the wire (EHS precedent)
                    services.ConfigureHttpJsonOptions(options =>
                        options.SerializerOptions.Converters.Add(
                            new System.Text.Json.Serialization.JsonStringEnumConverter()));
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

        return new QaEndpointTestHost(host);
    }

    public async ValueTask DisposeAsync()
    {
        Client.Dispose();
        await _host.StopAsync().ConfigureAwait(false);
        _host.Dispose();
    }
}

/// <summary>
/// Always-authenticated test scheme so RequireAuthorization() passes.
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
        // Carries a real "tid" claim (ADR-061): hosts resolve the tenant from the token,
        // and the X-Tenant-Id header is only accepted when it matches this claim.
        var identity = new ClaimsIdentity(
            new[]
            {
                new Claim(ClaimTypes.NameIdentifier, "test-user"),
                new Claim("tid", QaEndpointTestHost.TenantId.ToString()),
            }, Scheme);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
