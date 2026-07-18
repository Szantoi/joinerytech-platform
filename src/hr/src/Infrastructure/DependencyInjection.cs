using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.HR.Domain.Repositories;
using SpaceOS.Modules.HR.Infrastructure.Persistence;
using SpaceOS.Modules.HR.Infrastructure.Persistence.Repositories;

namespace SpaceOS.Modules.HR.Infrastructure;

/// <summary>
/// Dependency injection extension for HR Infrastructure layer.
/// (DMS Week 3 pattern reuse)
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Add HR Infrastructure services to the dependency injection container.
    /// </summary>
    /// <remarks>
    /// Tenancy comes from the shared SpaceOS.Modules.Hosting baseline (ADR-061/062):
    /// the claims-backed tenant context and the fail-loud RLS session interceptor replace
    /// the per-module interceptor copy (which targeted the wrong session key and a
    /// migration that never ran).
    /// </remarks>
    public static IServiceCollection AddHRInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Shared tenant context + RLS session interceptor (ADR-061/062).
        services.AddSpaceOsModuleTenancy();

        // Module-local ITenantContext (Application/Contracts) → shared context adapter.
        services.AddScoped<Application.Contracts.ITenantContext, HostingTenantContextAdapter>();

        // DbContext with the shared RLS interceptor (fail-loud — ADR-062)
        services.AddDbContext<HRDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("HRDatabase")
                ?? throw new InvalidOperationException("Connection string 'HRDatabase' not found.");

            options.UseNpgsql(connectionString);
            options.AddInterceptors(sp.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        // Repositories
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IAbsenceRepository, AbsenceRepository>();

        return services;
    }
}
