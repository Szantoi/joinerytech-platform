using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Tests.Tenancy;

/// <summary>
/// Builds the Docker-free TestServer host used by the tenancy pipeline contract tests:
/// authentication → authorization → <c>UseSpaceOsModuleTenancy()</c> → endpoints, exactly
/// like a real module host.
/// </summary>
internal static class TenancyTestHost
{
    /// <summary>Starts a TestServer host with the shared tenancy pipeline.</summary>
    /// <param name="configureServices">Additional service registrations (e.g. the auth scheme).</param>
    /// <param name="environment">Host environment name.</param>
    public static async Task<IHost> StartAsync(
        Action<IServiceCollection> configureServices,
        string environment = "Production")
    {
        var host = await new HostBuilder()
            .ConfigureWebHost(web => web
                .UseTestServer()
                .UseEnvironment(environment)
                .ConfigureServices(services =>
                {
                    services.AddRouting();
                    services.AddSpaceOsModuleTenancy();
                    configureServices(services);
                })
                .Configure(app =>
                {
                    app.UseRouting();
                    app.UseAuthentication();
                    app.UseAuthorization();
                    app.UseSpaceOsModuleTenancy();
                    app.UseEndpoints(endpoints =>
                    {
                        endpoints.MapGet("/whoami", (ITenantContext tenant) => Results.Ok(new
                        {
                            hasTenant = tenant.HasTenant,
                            tenantId = tenant.HasTenant ? tenant.TenantId : (Guid?)null,
                        })).RequireAuthorization();

                        endpoints.MapGet("/anonymous", (ITenantContext tenant) => Results.Ok(new
                        {
                            hasTenant = tenant.HasTenant,
                        }));
                    });
                }))
            .StartAsync();

        return host;
    }

    /// <summary>Registers the header-driven test authentication scheme.</summary>
    public static void UseTestAuth(IServiceCollection services)
    {
        services
            .AddAuthentication(TestAuthHandler.SchemeName)
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, static _ => { });
        services.AddAuthorization();
    }
}
