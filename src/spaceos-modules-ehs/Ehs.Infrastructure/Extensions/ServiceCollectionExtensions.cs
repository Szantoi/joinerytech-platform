using Ehs.Application.Services;
using Ehs.Infrastructure.Data;
using Ehs.Infrastructure.Interceptors;
using Ehs.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ehs.Infrastructure.Extensions;

/// <summary>
/// Extension methods for registering EHS infrastructure services.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers EHS infrastructure services including DbContext, interceptors, and user context.
    /// </summary>
    public static IServiceCollection AddEhsInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        // Register IHttpContextAccessor (required by CurrentUserService)
        services.AddHttpContextAccessor();

        // Register ICurrentUserService (scoped - per HTTP request)
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // Register TenantIsolationInterceptor (scoped - needs ICurrentUserService)
        services.AddScoped<TenantIsolationInterceptor>();

        // Register EhsDbContext with interceptor
        services.AddDbContext<EhsDbContext>((serviceProvider, options) =>
        {
            // Get the interceptor from DI (ensures it has access to ICurrentUserService)
            var tenantInterceptor = serviceProvider.GetRequiredService<TenantIsolationInterceptor>();

            options.UseNpgsql(connectionString, npgsqlOptions =>
            {
                npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "ehs");
                npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
            });

            // Add the tenant isolation interceptor (CRITICAL for RLS)
            options.AddInterceptors(tenantInterceptor);

            // Development: Enable sensitive data logging (disable in production)
#if DEBUG
            options.EnableSensitiveDataLogging();
            options.EnableDetailedErrors();
#endif
        });

        return services;
    }
}
