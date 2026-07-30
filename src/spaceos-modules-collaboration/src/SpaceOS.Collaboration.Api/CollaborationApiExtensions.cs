using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Api.Authorization;
using SpaceOS.Collaboration.Api.Endpoints;
using SpaceOS.Collaboration.Application;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Modules.Hosting.Authorization;

namespace SpaceOS.Collaboration.Api;

/// <summary>
/// Composition of the collaboration HTTP surface (B2B-10 F3/2).
/// </summary>
public static class CollaborationApiExtensions
{
    /// <summary>The ADR-067 canonical module id this API belongs to.</summary>
    public const string ModuleId = "spaceos.collaboration";

    /// <summary>Route base, per the B2B-10 F0 decision.</summary>
    public const string RouteBase = "/api/collaboration/v1";

    /// <summary>
    /// Adds the API layer: the caller context, the module entitlement policy, ProblemDetails and
    /// the application layer underneath.
    /// </summary>
    /// <remarks>
    /// The caller context is registered HERE and nowhere else. The application layer declares the
    /// interface and refuses to guess what "the caller" means; a process that maps these endpoints
    /// is exactly the process that knows.
    /// </remarks>
    public static IServiceCollection AddCollaborationApi(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddCollaborationApplication();

        services.AddHttpContextAccessor();
        services.AddScoped<ICollaborationCallerContext, HttpCollaborationCallerContext>();

        // RFC 7807 for everything, including the framework's own 401/403 — the Doorstar client
        // should not have to parse two different error shapes depending on who refused it.
        services.AddProblemDetails();
        services.AddExceptionHandler<CollaborationExceptionHandler>();

        // ERPSEP-06 interim module gate. Fail-closed by construction: a tenant whose token does
        // not list this module gets 403 on every business route.
        services.AddRequiredEnabledModulePolicy(ModuleId);

        services.Configure<JsonOptions>(options =>
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

        return services;
    }

    /// <summary>
    /// Maps every collaboration route under <see cref="RouteBase"/>, authorized and module-gated.
    /// </summary>
    /// <remarks>
    /// The gate is applied to the GROUP rather than to each endpoint. Per-endpoint attributes are
    /// one forgotten line away from an unauthenticated route, and that line is invisible in review
    /// precisely because it is absent.
    /// </remarks>
    public static RouteGroupBuilder MapCollaborationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        var group = endpoints
            .MapGroup(RouteBase)
            .RequireAuthorization()
            .RequireEnabledModule(ModuleId);

        group.MapAgreementEndpoints();
        group.MapWorkPackageEndpoints();

        return group;
    }
}
