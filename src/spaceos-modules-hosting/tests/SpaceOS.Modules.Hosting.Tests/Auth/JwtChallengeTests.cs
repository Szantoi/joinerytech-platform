using System.Net;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tests.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>
/// Kernel-parity 401 contract of the Keycloak-mode bearer configuration: a token-less
/// request gets a ProblemDetails 401 without any JWKS/metadata round-trip.
/// </summary>
public sealed class JwtChallengeTests
{
    [Fact]
    public async Task Missing_token_yields_problem_details_401()
    {
        using var host = await TenancyTestHost.StartAsync(services =>
            services.AddSpaceOsModuleAuth(
                new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Jwt:Authority"] = "https://keycloak.invalid/realms/spaceos",
                    ["Jwt:Audience"] = "test-api",
                }).Build(),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Production" }));
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/whoami");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("A valid JWT Bearer token is required.", body);
    }
}
