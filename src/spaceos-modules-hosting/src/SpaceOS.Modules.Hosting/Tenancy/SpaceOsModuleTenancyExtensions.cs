using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SpaceOS.Modules.Hosting.Persistence;

namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// Registration entry points for the shared module tenancy pipeline
/// (<c>AddSpaceOsModuleTenancy</c> + <c>UseSpaceOsModuleTenancy</c>, ADR-061).
/// </summary>
public static class SpaceOsModuleTenancyExtensions
{
    /// <summary>
    /// Registers the tenant context (<see cref="ClaimsTenantContext"/>) and the shared RLS
    /// session interceptor (<see cref="SpaceOsTenantSessionInterceptor"/>).
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <returns>The same service collection, for chaining.</returns>
    /// <remarks>
    /// Uses <c>TryAdd</c> so tests may pre-register a <see cref="FixedTenantContext"/> for
    /// non-HTTP scenarios.
    /// </remarks>
    public static IServiceCollection AddSpaceOsModuleTenancy(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.AddHttpContextAccessor();
        // ILogger<T> is a hard dependency of the middleware and the interceptor; AddLogging
        // is idempotent and adds no providers on its own (plain ServiceCollection fixtures).
        services.AddLogging();
        services.TryAddScoped<ITenantContext, ClaimsTenantContext>();
        services.TryAddScoped<SpaceOsTenantSessionInterceptor>();
        return services;
    }

    /// <summary>
    /// Adds <see cref="TenantResolutionMiddleware"/> to the pipeline. Must run after
    /// <c>UseAuthentication()</c> so the JWT principal is available.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <returns>The same application builder, for chaining.</returns>
    public static IApplicationBuilder UseSpaceOsModuleTenancy(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app);
        return app.UseMiddleware<TenantResolutionMiddleware>();
    }
}
