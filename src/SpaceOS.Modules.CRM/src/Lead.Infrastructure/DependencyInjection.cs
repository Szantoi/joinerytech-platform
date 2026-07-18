using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application;
using SpaceOS.Modules.CRM.Domain.Repositories;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Persistence.Repositories;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.CRM.Infrastructure;

/// <summary>
/// CRM module composition root (EHS <c>AddEhsModule</c> precedent): DbContext,
/// repositories, MediatR handlers, validators and the module options.
/// </summary>
public static class DependencyInjection
{
    /// <summary>Connection string name in the host configuration.</summary>
    public const string ConnectionStringName = "CrmDatabase";

    /// <summary>
    /// Registers the whole CRM module on the host.
    /// </summary>
    public static IServiceCollection AddCrmModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddCrmPersistence(configuration);
        services.AddCrmApplication(configuration);

        return services;
    }

    /// <summary>
    /// Registers the CRM DbContext (PostgreSQL) and the repositories.
    /// Kept separate so tests can swap in another provider (in-memory) and still
    /// reuse the production repository implementations.
    /// </summary>
    public static IServiceCollection AddCrmPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString(ConnectionStringName)
            ?? throw new InvalidOperationException(
                $"Connection string '{ConnectionStringName}' is not configured for the CRM host.");

        // Shared tenancy (ADR-061/062): claims-backed tenant context + the fail-loud RLS
        // session interceptor. Before this the CRM had NO tenant interceptor at all —
        // the DbContext comment claimed "RLS in the deployed database" while no RLS existed.
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<CrmDbContext>((serviceProvider, options) =>
            options.UseNpgsql(connectionString, npgsql =>
                    npgsql.MigrationsHistoryTable("__EFMigrationsHistory", CrmDbContext.SchemaName))
                .AddInterceptors(serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>()));

        services.AddCrmRepositories();

        return services;
    }

    /// <summary>Registers the repository implementations only.</summary>
    public static IServiceCollection AddCrmRepositories(this IServiceCollection services)
    {
        services.AddScoped<ILeadRepository, LeadRepository>();
        services.AddScoped<IOpportunityRepository, OpportunityRepository>();

        return services;
    }
}
