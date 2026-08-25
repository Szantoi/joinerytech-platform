using System.Collections.Concurrent;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Tests.Auth.Protocol;

/// <summary>Owns the three isolated TestServer processes used by the protocol E2E tests.</summary>
internal sealed class CanonicalOidcProtocolHarness : IAsyncDisposable
{
    private readonly IHost _moduleHost;
    private readonly HttpClient _moduleClient;
    private readonly ConcurrentQueue<IReadOnlyList<string>> _moduleJwksSnapshots;
    private readonly ProtocolOidcPrewarmStartGate _prewarmStartGate;
    private int _moduleStopped;

    private CanonicalOidcProtocolHarness(
        FakeOidcAuthority oidc,
        FakeOidcBrowserClient browser,
        FakeKernelIdentityAuthority kernel,
        IHost moduleHost,
        HttpClient moduleClient,
        ConcurrentQueue<IReadOnlyList<string>> moduleJwksSnapshots,
        ProtocolOidcPrewarmStartGate prewarmStartGate,
        JwtBearerOptions jwtOptions,
        OidcAuthorityRuntimeState oidcRuntimeState)
    {
        Oidc = oidc;
        Browser = browser;
        Kernel = kernel;
        _moduleHost = moduleHost;
        _moduleClient = moduleClient;
        _moduleJwksSnapshots = moduleJwksSnapshots;
        _prewarmStartGate = prewarmStartGate;
        JwtOptions = jwtOptions;
        OidcRuntimeState = oidcRuntimeState;
    }

    internal FakeOidcAuthority Oidc { get; }

    internal FakeOidcBrowserClient Browser { get; }

    internal FakeKernelIdentityAuthority Kernel { get; }

    internal JwtBearerOptions JwtOptions { get; }

    internal OidcAuthorityRuntimeState OidcRuntimeState { get; }

    internal IReadOnlyList<IReadOnlyList<string>> ModuleJwksSnapshots
        => _moduleJwksSnapshots.ToArray();

    internal static async Task<CanonicalOidcProtocolHarness> StartAsync(
        TimeProvider? timeProvider = null,
        TimeProvider? globalTimeProvider = null,
        ProtocolEndpointFault initialDiscoveryFault = ProtocolEndpointFault.None,
        ProtocolJwksFault initialJwksFault = ProtocolJwksFault.None,
        Action<IServiceCollection>? configureAfterAuth = null)
    {
        var oidc = new FakeOidcAuthority
        {
            DiscoveryFault = initialDiscoveryFault,
            JwksFault = initialJwksFault,
        };
        var browser = new FakeOidcBrowserClient(oidc);
        var kernel = new FakeKernelIdentityAuthority();
        var snapshots = new ConcurrentQueue<IReadOnlyList<string>>();
        var prewarmStartGate = new ProtocolOidcPrewarmStartGate();
        IHost? moduleHost = null;
        try
        {
            timeProvider ??= TimeProvider.System;
            globalTimeProvider ??= timeProvider;
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(ConfigurationValues())
                .Build();
            var jwtEnvironment = new HostingEnvironment
            {
                EnvironmentName = Environments.Production,
                ApplicationName = typeof(CanonicalOidcProtocolHarness).Assembly.GetName().Name
                    ?? "SpaceOS.Modules.Hosting.Tests",
            };
            var kernelEnvironment = new HostingEnvironment
            {
                EnvironmentName = Environments.Development,
                ApplicationName = jwtEnvironment.ApplicationName,
            };

            moduleHost = await new HostBuilder()
                .ConfigureWebHost(web => web
                    .UseTestServer()
                    .ConfigureServices(services =>
                    {
                        services.AddRouting();
                        // The production Kernel DNS pin is intentionally not activated. The HTTP
                        // provider uses its sole source-pinned Development loopback contract while
                        // JwtBearer itself still receives the Production environment below.
                        services.AddSingleton<IHostEnvironment>(kernelEnvironment);
                        services.AddSingleton<TimeProvider>(globalTimeProvider);
                        services.AddSingleton<IOidcAuthorityPrewarmStartGate>(prewarmStartGate);
                        services.AddSpaceOsModuleTenancy();
                        services.AddSpaceOsModuleAuth(configuration, jwtEnvironment);
                        services.AddOidcAuthorityTestClock(timeProvider);
                        services.AddOidcAuthorityTestTransport(() =>
                            oidc.CreateStrictHandler(request =>
                            {
                                if (request.RequestUri?.AbsolutePath == FakeOidcAuthority.JwksPath)
                                    snapshots.Enqueue(oidc.PublishedKeyIds());
                            }));
                        configureAfterAuth?.Invoke(services);
                        services.AddKernelOnlineIdentityAuthorityStateProvider<ProtocolKernelServiceAuthenticator>(
                            configuration);

                        // Both protocol transports are internal friend-test hooks. Public JwtBearer
                        // backchannel options never participate in the source-owned OIDC trust path.
                        services.AddKernelOnlineIdentityAuthorityTestTransport(
                            kernel.CreateStrictHandler);
                    })
                    .Configure(app =>
                    {
                        app.UseRouting();
                        app.UseAuthentication();
                        app.UseAuthorization();
                        app.UseSpaceOsModuleTenancy();
                        app.UseEndpoints(endpoints =>
                        {
                            endpoints.MapGet("/auth-inspect", async context =>
                            {
                                var result = await context.AuthenticateAsync(
                                    JwtBearerDefaults.AuthenticationScheme).ConfigureAwait(false);
                                await context.Response.WriteAsJsonAsync(new
                                {
                                    succeeded = result.Succeeded,
                                    hasBootstrapContext = result.Principal?.Identities.Any(
                                        static identity => identity.BootstrapContext is not null) == true,
                                    hasStoredToken = result.Properties?.GetTokens().Any() == true,
                                }).ConfigureAwait(false);
                            });
                            endpoints.MapGet(
                                 "/tenant",
                                 (ITenantContext tenant) => Results.Ok(new
                                 {
                                     tenantId = tenant.TenantId,
                                 }))
                                .RequireAuthorization();
                            endpoints.MapGet("/forbidden", static () => Results.NoContent())
                                .RequireAuthorization(policy => policy.RequireClaim("never-present"));
                        });
                    }))
                .StartAsync()
                .ConfigureAwait(false);

            var jwtOptions = moduleHost.Services
                .GetRequiredService<IOptionsMonitor<JwtBearerOptions>>()
                .Get(JwtBearerDefaults.AuthenticationScheme);
            if (jwtOptions.ConfigurationManager is not StrictOidcConfigurationManager strictManager
                || !strictManager.UsesRealIdentityModelConfigurationManager
                || !strictManager.InnerLastKnownGoodDisabled
                || !strictManager.HasExactSourceOwnedRuntimeContract())
            {
                throw new InvalidOperationException(
                    "The protocol harness did not receive the strict facade over the real OIDC ConfigurationManager.");
            }

            if (jwtOptions.TokenValidationParameters.IssuerSigningKeyResolver is not null)
            {
                throw new InvalidOperationException(
                    "The protocol harness must not replace JWKS with a signing-key resolver.");
            }

            return new CanonicalOidcProtocolHarness(
                oidc,
                browser,
                kernel,
                moduleHost,
                moduleHost.GetTestClient(),
                snapshots,
                prewarmStartGate,
                jwtOptions,
                moduleHost.Services.GetRequiredService<OidcAuthorityRuntimeState>());
        }
        catch
        {
            if (moduleHost is not null)
            {
                await moduleHost.StopAsync().ConfigureAwait(false);
                moduleHost.Dispose();
            }

            browser.Dispose();
            await kernel.DisposeAsync().ConfigureAwait(false);
            await oidc.DisposeAsync().ConfigureAwait(false);
            throw;
        }
    }

    internal async Task<HttpResponseMessage> SendAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/tenant");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await _moduleClient.SendAsync(request).ConfigureAwait(false);
    }

    internal async Task<HttpResponseMessage> InspectAuthenticationAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/auth-inspect");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await _moduleClient.SendAsync(request).ConfigureAwait(false);
    }

    internal async Task<HttpResponseMessage> SendForbiddenAsync(string accessToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/forbidden");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return await _moduleClient.SendAsync(request).ConfigureAwait(false);
    }

    internal async Task<HealthStatus> CheckOidcReadinessAsync()
    {
        var report = await _moduleHost.Services
            .GetRequiredService<HealthCheckService>()
            .CheckHealthAsync(static registration => registration.Name == "oidc-authority")
            .ConfigureAwait(false);
        return report.Status;
    }

    internal void ReleaseOidcPrewarm() => _prewarmStartGate.Release();

    internal async Task StopModuleAsync(CancellationToken cancellationToken = default)
    {
        if (Interlocked.Exchange(ref _moduleStopped, 1) == 0)
            await _moduleHost.StopAsync(cancellationToken).ConfigureAwait(false);
    }

    internal static OnlineIdentityAuthorityState ActiveState(
        ProtocolOidcGrant grant,
        DateTimeOffset? acceptTokensIssuedAtOrAfter = null,
        bool tenantActive = true,
        bool membershipActive = true,
        long? membershipVersion = null,
        long? projectionVersion = null,
        IReadOnlyCollection<string>? permissions = null,
        IReadOnlyCollection<string>? enabledModules = null)
        => new(
            grant.Subject,
            grant.TenantId,
            tenantActive,
            membershipActive,
            membershipVersion ?? grant.MembershipVersion,
            projectionVersion ?? grant.ProjectionVersion,
            acceptTokensIssuedAtOrAfter ?? grant.IssuedAt.AddMinutes(-1),
            permissions ?? grant.Permissions.ToArray(),
            enabledModules ?? grant.EnabledModules.ToArray());

    internal static IReadOnlyDictionary<string, string?> ConfigurationValues()
        => new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["Jwt:Mode"] = SpaceOsModuleAuthOptions.KeycloakMode,
            ["Jwt:Authority"] = FakeOidcAuthority.Issuer,
            ["Jwt:Audience"] = FakeOidcAuthority.Audience,
            ["Jwt:AuthorizedParty"] = FakeOidcAuthority.ClientId,
            ["Jwt:TokenType"] = "JWT",
            ["Jwt:AccessTokenPayloadType"] = "Bearer",
            ["Jwt:OidcAuthority:BackchannelTimeoutMilliseconds"] = "250",
            ["Jwt:OidcAuthority:RefreshIntervalSeconds"] = "1",
            ["Jwt:OidcAuthority:AutomaticRefreshIntervalMinutes"] = "5",
            ["Jwt:OidcAuthority:MaximumConfigurationAgeSeconds"] = "5",
            ["Jwt:OidcAuthority:MaximumDocumentBytes"] = "32768",
            ["Jwt:OidcAuthority:MaximumSigningKeys"] = "8",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:Enabled"] = "true",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:BaseUrl"] =
                FakeKernelIdentityAuthority.Origin + "/",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AllowDevelopmentLoopbackHttp"] = "true",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:ServiceAuthReference"] =
                FakeKernelIdentityAuthority.ServiceAuthReference,
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:TotalTimeoutMilliseconds"] = "300",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:AttemptTimeoutMilliseconds"] = "100",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxAttempts"] = "1",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:RetryDelayMilliseconds"] = "0",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:CacheTtlMilliseconds"] = "0",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:MaxResponseBytes"] = "32768",
            [$"{KernelOnlineIdentityAuthorityOptions.SectionName}:ReadinessMaximumAgeSeconds"] = "60",
        };

    public async ValueTask DisposeAsync()
    {
        _moduleClient.Dispose();
        await StopModuleAsync().ConfigureAwait(false);
        _moduleHost.Dispose();
        Browser.Dispose();
        await Kernel.DisposeAsync().ConfigureAwait(false);
        await Oidc.DisposeAsync().ConfigureAwait(false);
    }
}

internal sealed class ProtocolOidcPrewarmStartGate : IOidcAuthorityPrewarmStartGate
{
    private readonly TaskCompletionSource _released = new(
        TaskCreationOptions.RunContinuationsAsynchronously);

    public ValueTask WaitAsync(CancellationToken cancellationToken)
        => new(_released.Task.WaitAsync(cancellationToken));

    internal void Release() => _released.TrySetResult();
}

internal sealed class ProtocolManualTimeProvider(DateTimeOffset initialUtc) : TimeProvider
{
    private DateTimeOffset _utcNow = initialUtc;

    public override DateTimeOffset GetUtcNow() => _utcNow;

    internal void Advance(TimeSpan duration) => _utcNow += duration;
}
