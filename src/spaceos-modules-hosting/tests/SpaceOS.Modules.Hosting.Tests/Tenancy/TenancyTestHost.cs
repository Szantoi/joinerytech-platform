using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SpaceOS.Modules.Hosting.Authorization;
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
                    services.AddRequiredEnabledModulePolicy("spaceos.maintenance");
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

                        // Test-only wire-contract probe for synthetic development identities.
                        // Production hosts never expose raw JWT claims through an endpoint.
                        endpoints.MapGet("/claims/enabled-modules", (HttpContext context) => Results.Ok(new
                        {
                            value = context.User.FindFirst(TenancyDefaults.TenantListClaim)?.Value,
                        })).RequireAuthorization();

                        var maintenance = endpoints.MapGroup("/maintenance")
                            .RequireEnabledModule("spaceos.maintenance");
                        maintenance.MapGet("/protected", () => Results.Ok(new { ok = true }));
                        maintenance.MapPost("/protected", () => Results.Ok(new { ok = true }));
                        maintenance.MapGroup("/nested")
                            .MapMethods(
                                "/method-probe",
                                ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE", "TRACE", "CUSTOM"],
                                () => Results.Ok(new { ok = true }));
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
