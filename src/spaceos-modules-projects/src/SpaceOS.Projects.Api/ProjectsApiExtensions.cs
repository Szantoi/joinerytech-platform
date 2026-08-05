using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Authorization;
using SpaceOS.Projects.Api.Endpoints;
using SpaceOS.Projects.Api.Kernel;
using SpaceOS.Projects.Application;

namespace SpaceOS.Projects.Api;

/// <summary>
/// Composition of the projects HTTP surface (PROJ-06).
/// </summary>
public static class ProjectsApiExtensions
{
    /// <summary>The ADR-067 canonical module id this API belongs to.</summary>
    public const string ModuleId = "spaceos.projects";

    /// <summary>Route base — the module-per-path convention the collaboration API set.</summary>
    public const string RouteBase = "/api/projects/v1";

    /// <summary>
    /// Adds the API layer: ProblemDetails, the module entitlement policy, the Kernel-backed
    /// flow-epic resolver, and the application layer underneath.
    /// </summary>
    public static IServiceCollection AddProjectsApi(
        this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddProjectsApplication();

        // The flow-epic resolver forwards the caller's own bearer token (F5/2); only a request
        // scope has it, which is why the resolver lives here and not in Application.
        services.AddHttpContextAccessor();
        services.AddOptions<ProjectsKernelOptions>()
            .Bind(configuration.GetSection(ProjectsKernelOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<ProjectsKernelOptions>, ProjectsKernelOptionsValidator>();
        services.AddHttpClient<IFlowEpicResolver, HttpFlowEpicResolver>((serviceProvider, client) =>
        {
            var options = serviceProvider.GetRequiredService<IOptions<ProjectsKernelOptions>>().Value;

            // Trailing slash so relative paths append instead of replacing the last segment.
            client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
        });

        // RFC 7807 for everything, including the framework's own 401/403 — one error shape.
        services.AddProblemDetails();
        services.AddExceptionHandler<ProjectsExceptionHandler>();

        // ADR-067 module gate. Fail-closed by construction: a tenant whose token does not list
        // this module gets 403 on every business route.
        services.AddRequiredEnabledModulePolicy(ModuleId);

        return services;
    }

    /// <summary>
    /// Maps every projects route under <see cref="RouteBase"/>, authorized and module-gated.
    /// </summary>
    /// <remarks>
    /// The gate is applied to the GROUP, not to each endpoint — a forgotten per-endpoint
    /// attribute is invisible in review precisely because it is absent.
    /// </remarks>
    public static RouteGroupBuilder MapProjectsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        var group = endpoints
            .MapGroup(RouteBase)
            .RequireAuthorization()
            .RequireEnabledModule(ModuleId);

        group.MapProjectEndpoints();

        return group;
    }
}
