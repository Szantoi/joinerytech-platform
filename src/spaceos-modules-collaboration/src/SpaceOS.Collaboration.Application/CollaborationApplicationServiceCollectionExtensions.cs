using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
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
