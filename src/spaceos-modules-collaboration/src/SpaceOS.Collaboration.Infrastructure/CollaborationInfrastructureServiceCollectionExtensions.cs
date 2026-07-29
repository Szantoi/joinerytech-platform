using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Infrastructure.Data;

namespace SpaceOS.Collaboration.Infrastructure;

/// <summary>
/// Registers the Collaboration persistence: the repositories the application layer declares.
/// </summary>
/// <remarks>
/// The DbContext itself is registered by the HOST, because only the host knows the connection
/// string and which interceptors (tenant session, RLS) belong on it — that wiring is F2/F3, and
/// this extension deliberately does not guess it.
/// </remarks>
public static class CollaborationInfrastructureServiceCollectionExtensions
{
    /// <summary>Adds the EF-backed repositories.</summary>
    public static IServiceCollection AddCollaborationInfrastructure(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IWorkPackageRepository, WorkPackageRepository>();
        services.AddScoped<IAgreementRepository, AgreementRepository>();

        return services;
    }
}
