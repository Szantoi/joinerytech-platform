namespace SpaceOS.Modules.Kontrolling.Infrastructure;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence;
using SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Repositories;

/// <summary>
/// Infrastructure layer dependency injection configuration.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Add Kontrolling Infrastructure services.
    /// </summary>
    public static IServiceCollection AddKontrollingInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Register DbContext with Npgsql provider
        var connectionString = configuration.GetConnectionString("KontrollingDb")
            ?? throw new InvalidOperationException("KontrollingDb connection string is missing");

        services.AddDbContext<KontrollingDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(
                connectionString,
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history", "kontrolling");
                    npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                });

            // Resolved from the scope that owns the DbContext (EHS precedent).
            // The interceptor reads the tenant of the CURRENT request, so it
            // must not be captured from a container built at registration time.
            options.AddInterceptors(
                new TenantDbConnectionInterceptor(serviceProvider.GetRequiredService<ITenantContext>()));

#if DEBUG
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
#endif
        });

        // Register repositories
        services.AddScoped<IOverheadConfigRepository, OverheadConfigRepository>();
        services.AddScoped<ICostAdjustmentRepository, CostAdjustmentRepository>();

        return services;
    }
}
