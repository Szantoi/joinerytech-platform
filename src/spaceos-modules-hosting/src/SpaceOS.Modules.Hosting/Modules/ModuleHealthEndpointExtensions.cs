using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace SpaceOS.Modules.Hosting.Modules;

/// <summary>Maps an anonymous liveness endpoint without package fingerprint metadata.</summary>
public static class ModuleHealthEndpointExtensions
{
    /// <summary>
    /// Maps an anonymous liveness response. Package identity belongs in authenticated
    /// operational telemetry, never in an internet-reachable probe response.
    /// </summary>
    public static IEndpointRouteBuilder MapModuleHealth(
        this IEndpointRouteBuilder endpoints,
        string pattern = "/health")
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        endpoints.MapGet(pattern, async (HealthCheckService healthChecks, CancellationToken cancellationToken) =>
        {
            var report = await healthChecks.CheckHealthAsync(cancellationToken).ConfigureAwait(false);
            var response = new
            {
                status = report.Status.ToString()
            };

            return report.Status == HealthStatus.Unhealthy
                ? Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(response);
        }).AllowAnonymous();

        return endpoints;
    }
}
