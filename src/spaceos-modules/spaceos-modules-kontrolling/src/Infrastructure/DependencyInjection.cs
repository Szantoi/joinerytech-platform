namespace SpaceOS.Modules.Kontrolling.Infrastructure;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;
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

        services.AddDbContext<KontrollingDbContext>(options =>
        {
            options.UseNpgsql(
                connectionString,
                npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history", "kontrolling");
                    npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
                });

            // Add tenant interceptor
            options.AddInterceptors(
                services.BuildServiceProvider().GetRequiredService<TenantDbConnectionInterceptor>());

#if DEBUG
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
#endif
        });

        // Register TenantDbConnectionInterceptor
        services.AddSingleton<TenantDbConnectionInterceptor>();

        // Register repositories
        services.AddScoped<IOverheadConfigRepository, OverheadConfigRepository>();
        services.AddScoped<ICostAdjustmentRepository, CostAdjustmentRepository>();

        return services;
    }
}
