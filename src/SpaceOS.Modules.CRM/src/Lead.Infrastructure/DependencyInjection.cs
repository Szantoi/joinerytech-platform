using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application;
using SpaceOS.Modules.CRM.Domain.Repositories;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Persistence.Repositories;

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
        var connectionString = configuration.GetConnectionString(ConnectionStringName);

        services.AddDbContext<CrmDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
                npgsql.MigrationsHistoryTable("__EFMigrationsHistory", CrmDbContext.SchemaName)));

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
