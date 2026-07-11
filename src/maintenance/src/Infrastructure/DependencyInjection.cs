using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Repositories;

namespace SpaceOS.Modules.Maintenance.Infrastructure;

/// <summary>
/// Dependency injection extension for Maintenance infrastructure layer.
/// Registers DbContext, repositories, and RLS interceptor.
/// Reuses DMS Week 3 pattern for consistency.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Maintenance infrastructure services to the dependency injection container.
    /// </summary>
    public static IServiceCollection AddMaintenanceInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext with RLS interceptor (DMS pattern)
        services.AddDbContext<MaintenanceDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("MaintenanceDatabase");
            options.UseNpgsql(connectionString);
            options.AddInterceptors(sp.GetRequiredService<TenantDbConnectionInterceptor>());
        });

        // Repositories
        services.AddScoped<IAssetRepository, AssetRepository>();
        services.AddScoped<IWorkOrderRepository, WorkOrderRepository>();

        // RLS Interceptor
        services.AddScoped<TenantDbConnectionInterceptor>();

        return services;
    }
}
