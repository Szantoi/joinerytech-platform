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
/// principal carries the canonical native projection, and a forged tenant header is still rejected.
/// </summary>
public sealed class DevelopmentSchemeTests
{
    private static readonly Guid DevTenant = Guid.Parse("11111111-1111-1111-1111-111111111111");

    private static IConfiguration DevConfig(params string[] enabledModules)
    {
        var values = new Dictionary<string, string?>
        {
            ["Jwt:Mode"] = "Development",
            ["Jwt:Development:TenantId"] = DevTenant.ToString(),
            ["Jwt:Development:Roles:0"] = "Admin",
        };
        for (var index = 0; index < enabledModules.Length; index++)
            values[$"Jwt:Development:EnabledModules:{index}"] = enabledModules[index];

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private sealed record WhoAmIResponse(bool HasTenant, Guid? TenantId);
    private sealed record TenantProjectionClaimResponse(string? Value);

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

    [Fact]
    public async Task Development_host_allows_the_configured_module()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig("spaceos.maintenance"),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/maintenance/protected");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Development_host_uses_the_method_aware_admin_grant_for_writes()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig("spaceos.maintenance"),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.PostAsync("/maintenance/protected", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Development_host_without_modules_is_forbidden_by_the_module_gate()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig(),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/maintenance/protected");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Development_host_emits_configured_modules_in_the_native_projection()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig("spaceos.maintenance", "spaceos.qa"),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/claims/enabled-modules");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<TenantProjectionClaimResponse>();
        Assert.Equal(
            "[{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[\"spaceos.maintenance.admin\",\"spaceos.qa.admin\"],\"enabled_modules\":[\"spaceos.maintenance\",\"spaceos.qa\"]}]",
            body!.Value);
    }

    [Fact]
    public async Task Development_host_without_modules_emits_an_empty_native_projection()
    {
        using var host = await TenancyTestHost.StartAsync(
            services => services.AddSpaceOsModuleAuth(
                DevConfig(),
                new Microsoft.Extensions.Hosting.Internal.HostingEnvironment { EnvironmentName = "Development" }),
            environment: "Development");
        using var client = host.GetTestClient();

        var response = await client.GetAsync("/claims/enabled-modules");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<TenantProjectionClaimResponse>();
        Assert.Equal(
            "[{\"tenant_id\":\"11111111-1111-1111-1111-111111111111\",\"permissions\":[],\"enabled_modules\":[]}]",
            body!.Value);
    }
}
