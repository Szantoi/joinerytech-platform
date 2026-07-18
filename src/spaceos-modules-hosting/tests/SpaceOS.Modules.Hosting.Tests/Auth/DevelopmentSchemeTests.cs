using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Auth;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Hosting.Tests.Tenancy;
using Xunit;

namespace SpaceOS.Modules.Hosting.Tests.Auth;

/// <summary>
/// The Development scheme must behave exactly like production tenancy-wise: the synthetic
/// principal carries a real <c>tid</c>, and a forged tenant header is still rejected.
/// </summary>
public sealed class DevelopmentSchemeTests
{
    private static readonly Guid DevTenant = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static IConfiguration DevConfig() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Mode"] = "Development",
            ["Jwt:Development:TenantId"] = DevTenant.ToString(),
            ["Jwt:Development:Roles:0"] = "Admin",
        })
        .Build();

    private sealed record WhoAmIResponse(bool HasTenant, Guid? TenantId);

    [Fact]
    public async Task Development_host_authenticates_with_the_configured_tenant()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig(),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/whoami");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<WhoAmIResponse>();
        Assert.Equal(DevTenant, body!.TenantId);
    }

    [Fact]
    public async Task Development_host_still_rejects_forged_tenant_headers()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig(),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        using var request = new HttpRequestMessage(HttpMethod.Get, "/whoami");
        request.Headers.Add(TenancyDefaults.TenantHeader, Guid.NewGuid().ToString());

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
