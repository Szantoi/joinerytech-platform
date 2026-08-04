using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Modules;
using SpaceOS.Modules.Hosting.Tests.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Modules;

/// <summary>
/// Contract coverage for the shared anonymous liveness endpoint. Two properties are pinned
/// independently, because a probe response can fail in two opposite directions: it can say
/// too much (package fingerprint) or stop answering at all (a probe behind an auth wall).
/// </summary>
public sealed class ModuleHealthEndpointTests
{
    [Fact]
    public async Task Healthy_response_carries_the_liveness_status_and_nothing_else()
    {
        using var host = await StartAsync();
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { "status" }, await FieldNamesAsync(response));
        Assert.Equal("Healthy", await StatusAsync(response));
    }

    [Fact]
    public async Task Unhealthy_response_keeps_503_and_still_carries_nothing_else()
    {
        using var host = await StartAsync(services =>
            services.AddHealthChecks().AddCheck("forced", static () => HealthCheckResult.Unhealthy()));
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/health");

        // The exact field set is asserted here too: a "does not contain 'module'" assertion alone
        // would also pass on an empty body, i.e. on a probe that lost its liveness signal.
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(new[] { "status" }, await FieldNamesAsync(response));
        Assert.Equal("Unhealthy", await StatusAsync(response));
    }

    /// <summary>
    /// The redaction must not be paid for with availability: probes carry no token. Without
    /// <c>AllowAnonymous</c> this endpoint would answer 401 in any host that declares a
    /// fallback policy — and nothing else in the suite would notice.
    /// </summary>
    [Fact]
    public async Task Health_answers_without_a_token_under_a_fallback_authorization_policy()
    {
        using var host = await StartAsync(
            services => services.AddAuthorizationBuilder().SetFallbackPolicy(
                new AuthorizationPolicyBuilder(TestAuthHandler.SchemeName).RequireAuthenticatedUser().Build()),
            requireAuthorization: true);
        using var client = host.GetTestClient();

        // No X-Test-* header at all → TestAuthHandler returns NoResult, i.e. an anonymous caller.
        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await StatusAsync(response));
    }

    private static async Task<string[]> FieldNamesAsync(HttpResponseMessage response)
    {
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return payload.RootElement.EnumerateObject().Select(static property => property.Name).ToArray();
    }

    private static async Task<string?> StatusAsync(HttpResponseMessage response)
    {
        using var payload = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return payload.RootElement.GetProperty("status").GetString();
    }

    private static Task<IHost> StartAsync(
        Action<IServiceCollection>? configureServices = null,
        bool requireAuthorization = false)
        => new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddHealthChecks();
                    services.AddAuthentication(TestAuthHandler.SchemeName)
                        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, null);
                    configureServices?.Invoke(services);
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    if (requireAuthorization)
                    {
                        app.UseAuthentication();
                        app.UseAuthorization();
                    }

                    app.UseEndpoints(endpoints => endpoints.MapModuleHealth());
                }))
            .StartAsync();
}
