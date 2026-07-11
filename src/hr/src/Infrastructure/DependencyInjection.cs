using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
    public static IServiceCollection AddHRInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext with RLS interceptor (DMS pattern)
        services.AddDbContext<HRDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("HRDatabase")
                ?? throw new InvalidOperationException("Connection string 'HRDatabase' not found.");

            options.UseNpgsql(connectionString);
            options.AddInterceptors(sp.GetRequiredService<TenantDbConnectionInterceptor>());
        });

        // Repositories
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IAbsenceRepository, AbsenceRepository>();

        // RLS Interceptor
        services.AddScoped<TenantDbConnectionInterceptor>();

        return services;
    }
}
