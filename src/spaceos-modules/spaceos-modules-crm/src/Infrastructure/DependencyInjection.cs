using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application.Interfaces;
using SpaceOS.Modules.CRM.Infrastructure.Persistence;
using SpaceOS.Modules.CRM.Infrastructure.Repositories;

namespace SpaceOS.Modules.CRM.Infrastructure;

/// <summary>
/// Infrastructure layer dependency injection configuration
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddCrmInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // PostgreSQL connection string
        var connectionString = configuration.GetConnectionString("CrmDatabase")
            ?? throw new InvalidOperationException("CrmDatabase connection string is not configured");

        // Register DbContext
        services.AddDbContext<CrmDbContext>(options =>
        {
            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(CrmDbContext).Assembly.FullName);
                npgsqlOptions.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(5),
                    errorCodesToAdd: null);
            });
        });

        // Register repositories
        services.AddScoped<ILeadRepository, LeadRepository>();
        services.AddScoped<IOpportunityRepository, OpportunityRepository>();

        return services;
    }
}
