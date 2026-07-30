using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application.Authorization;
using SpaceOS.Collaboration.Application.Projections;

namespace SpaceOS.Collaboration.Application;

/// <summary>
/// Registers the Collaboration application layer: MediatR handlers, validators and projections.
/// </summary>
/// <remarks>
/// The F3 API host will sit on this and on <c>AddCollaborationInfrastructure</c>; keeping the two
/// separate means a host can compose the module with a different persistence (tests do exactly
/// that) without the application layer knowing.
/// </remarks>
public static class CollaborationApplicationServiceCollectionExtensions
{
    /// <summary>Adds handlers, validators and the projection service.</summary>
    public static IServiceCollection AddCollaborationApplication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        var assembly = Assembly.GetExecutingAssembly();

        services.AddMediatR(configuration => configuration.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: false);

        services.AddScoped<CollaborationProjectionService>();

        // Grant-based authorization (B2B-10 F3). Registered here rather than in the host so that
        // composing the module cannot leave the guard out: every handler takes it as a
        // constructor dependency, so a host that forgot it would fail to build the handler
        // instead of running without authorization.
        //
        // ICollaborationCallerContext is deliberately NOT registered here — only whoever knows
        // what "the caller" means in its process can supply it (the API host from the resolved
        // tenant, a worker from its job context). Missing it fails loudly at the first request.
        services.AddScoped<ICollaborationAccessGuard, CollaborationAccessGuard>();

        // A real clock unless the host replaces it. Handlers take TimeProvider rather than
        // reading UtcNow, so an audit trail's timestamps can be asserted in tests.
        services.TryAddTimeProvider();

        return services;
    }

    private static void TryAddTimeProvider(this IServiceCollection services)
    {
        if (services.All(descriptor => descriptor.ServiceType != typeof(TimeProvider)))
        {
            services.AddSingleton(TimeProvider.System);
        }
    }
}
