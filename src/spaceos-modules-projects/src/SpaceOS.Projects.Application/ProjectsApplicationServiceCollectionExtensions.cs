using Microsoft.Extensions.DependencyInjection;

namespace SpaceOS.Projects.Application;

/// <summary>Registers the projects application layer: the MediatR handlers and the clock.</summary>
public static class ProjectsApplicationServiceCollectionExtensions
{
    /// <summary>Adds the command handlers of this assembly.</summary>
    /// <remarks>
    /// <para>
    /// <b>What this method does NOT register, and why that is the point:</b>
    /// <see cref="Projects.IProjectCodeAllocator"/> has no implementation while ADR-072 §7.3 is
    /// open, and <see cref="Tenancy.ICurrentTenant"/> can only be satisfied by a composition that
    /// knows what "the current request" means. A host that forgets either fails at the first
    /// resolution — loudly — instead of running with an invented code format or an empty tenant.
    /// </para>
    /// </remarks>
    public static IServiceCollection AddProjectsApplication(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddMediatR(configuration =>
            configuration.RegisterServicesFromAssembly(
                typeof(ProjectsApplicationServiceCollectionExtensions).Assembly));

        // The framework clock, so a test can move time without the module owning a clock port.
        services.AddSingleton(TimeProvider.System);

        return services;
    }
}
