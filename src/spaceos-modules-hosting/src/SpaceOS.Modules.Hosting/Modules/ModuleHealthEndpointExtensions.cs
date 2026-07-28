using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace SpaceOS.Modules.Hosting.Modules;

/// <summary>Maps a liveness endpoint that also identifies the loaded module package.</summary>
public static class ModuleHealthEndpointExtensions
{
    /// <summary>Maps an anonymous health response with module identity and migration metadata.</summary>
    public static IEndpointRouteBuilder MapModuleHealth(
        this IEndpointRouteBuilder endpoints,
        ModuleDescriptor descriptor,
        string pattern = "/health")
    {
        ArgumentNullException.ThrowIfNull(endpoints);
        ArgumentNullException.ThrowIfNull(descriptor);

        endpoints.MapGet(pattern, async (HealthCheckService healthChecks, CancellationToken cancellationToken) =>
        {
            var report = await healthChecks.CheckHealthAsync(cancellationToken).ConfigureAwait(false);
            var response = new
            {
                status = report.Status.ToString(),
                moduleId = descriptor.ModuleId,
                version = descriptor.Version,
                migrationsAssembly = descriptor.MigrationsAssembly
            };

            return report.Status == HealthStatus.Unhealthy
                ? Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(response);
        }).AllowAnonymous();

        return endpoints;
    }
}
