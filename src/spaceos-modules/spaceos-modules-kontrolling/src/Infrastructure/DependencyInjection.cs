namespace SpaceOS.Modules.Kontrolling.Infrastructure;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Kontrolling.Application.Services;
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

            // Shared, fail-loud RLS session interceptor (ADR-062) — resolved from the
            // scope that owns the DbContext, so it reads the CURRENT request's tenant.
            options.AddInterceptors(
                serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());

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
