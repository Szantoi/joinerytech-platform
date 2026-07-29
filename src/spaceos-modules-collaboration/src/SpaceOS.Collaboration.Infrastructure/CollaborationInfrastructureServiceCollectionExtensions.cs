using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Collaboration.Application.Repositories;
using SpaceOS.Collaboration.Infrastructure.Data;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.Infrastructure;

/// <summary>
/// Registers the Collaboration persistence: the DbContext with the shared RLS session
/// interceptor, and the repositories the application layer declares.
/// </summary>
/// <remarks>
/// <para>
/// Tenancy comes from the ADR-061/062 hosting baseline: the claims-backed
/// <c>ITenantContext</c> plus the fail-loud <see cref="SpaceOsTenantSessionInterceptor"/>, which
/// writes <c>app.current_tenant_id</c> on every opened connection and clears it before the
/// connection returns to the pool. This is the same registration the other six module
/// infrastructures use, and wiring it here rather than in each host is what stops the module
/// from acquiring a private interceptor copy later.
/// </para>
/// <para>
/// <b>Until F2 this method registered repositories only</b>, on the reasoning that the host owns
/// the DbContext. That left the module in a state where nothing set the session key at all,
/// while the migrations already installed <c>FORCE ROW LEVEL SECURITY</c> policies that read it
/// — the policies had no counterpart in the application. The connection string stays the host's
/// business; the interceptor does not, because leaving it optional is precisely how a module
/// ends up running without isolation.
/// </para>
/// </remarks>
public static class CollaborationInfrastructureServiceCollectionExtensions
{
    /// <summary>The configuration key holding this module's PostgreSQL connection string.</summary>
    public const string ConnectionStringName = "CollaborationDatabase";

    /// <summary>
    /// Adds the Collaboration DbContext (tenant-intercepted) and the EF-backed repositories.
    /// </summary>
    /// <param name="services">The container.</param>
    /// <param name="configuration">Supplies <c>ConnectionStrings:CollaborationDatabase</c>.</param>
    /// <exception cref="InvalidOperationException">
    /// The connection string is missing. Deliberately fatal at first resolution rather than
    /// falling back to a default: a module that silently connects somewhere else is worse than
    /// one that refuses to start.
    /// </exception>
    public static IServiceCollection AddCollaborationInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        // Shared tenant context + RLS session interceptor (ADR-061/062).
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<CollaborationDbContext>((serviceProvider, options) =>
        {
            var connectionString = configuration.GetConnectionString(ConnectionStringName)
                ?? throw new InvalidOperationException(
                    $"ConnectionStrings:{ConnectionStringName} is not configured for the Collaboration module host.");

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        return services.AddCollaborationRepositories();
    }

    /// <summary>
    /// Adds only the repositories, for callers that own the <see cref="CollaborationDbContext"/>
    /// registration themselves — integration tests against a container, and design-time tooling.
    /// </summary>
    /// <remarks>
    /// Kept separate and named for what it is, so that "no interceptor" is always a visible
    /// choice at the call site rather than a side effect of picking the shorter overload.
    /// </remarks>
    public static IServiceCollection AddCollaborationRepositories(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddScoped<IWorkPackageRepository, WorkPackageRepository>();
        services.AddScoped<IAgreementRepository, AgreementRepository>();

        return services;
    }
}
