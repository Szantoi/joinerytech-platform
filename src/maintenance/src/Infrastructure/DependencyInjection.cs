using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.Services;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Repositories;

namespace SpaceOS.Modules.Maintenance.Infrastructure;

/// <summary>
/// Dependency injection extension for Maintenance infrastructure layer.
/// Registers DbContext, repositories, and the shared RLS session interceptor.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Adds Maintenance infrastructure services to the dependency injection container.
    /// </summary>
    /// <remarks>
    /// Tenancy comes from the shared SpaceOS.Modules.Hosting baseline (ADR-061/062):
    /// the claims-backed <see cref="ITenantContext"/> plus the fail-loud
    /// <see cref="SpaceOsTenantSessionInterceptor"/> replace the module-local
    /// <c>TenantDbConnectionInterceptor</c> copy (which used the divergent
    /// <c>app.tenant_id</c> session key and silently skipped empty tenants).
    /// </remarks>
    public static IServiceCollection AddMaintenanceInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Shared tenant context + RLS session interceptor (ADR-061/062).
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<MaintenanceDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("MaintenanceDatabase")
                ?? throw new InvalidOperationException(
                    "ConnectionStrings:MaintenanceDatabase is not configured for the Maintenance module host.");

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(sp.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        // Repositories
        services.AddScoped<IAssetRepository, AssetRepository>();
        services.AddScoped<IWorkOrderRepository, WorkOrderRepository>();

        // Stateless domain services (query handlers depend on them; no state → singleton)
        services.AddSingleton<IAssetStatusCalculationService, AssetStatusCalculationService>();
        services.AddSingleton<IMaintenanceCostEstimatorService, MaintenanceCostEstimatorService>();
        services.AddSingleton<IPreventiveMaintenanceSchedulerService, PreventiveMaintenanceSchedulerService>();

        return services;
    }
}
