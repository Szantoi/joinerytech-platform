using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Infrastructure.Persistence;
using SpaceOS.Modules.QA.Infrastructure.Persistence.Repositories;

namespace SpaceOS.Modules.QA.Infrastructure;

/// <summary>
/// Dependency Injection extension for QA module infrastructure.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Add QA Infrastructure services to the dependency injection container.
    /// </summary>
    /// <remarks>
    /// Tenancy comes from the shared SpaceOS.Modules.Hosting baseline (ADR-061/062):
    /// the claims-backed <see cref="ITenantContext"/> plus the fail-loud RLS session
    /// interceptor replace the old placeholder DefaultTenantContext and the
    /// error-swallowing per-module interceptor copy.
    /// </remarks>
    public static IServiceCollection AddQAInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Shared tenant context + RLS session interceptor (ADR-061/062).
        services.AddSpaceOsModuleTenancy();

        services.AddDbContext<QADbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("QA")
                ?? throw new InvalidOperationException(
                    "ConnectionStrings:QA is not configured for the QA module host.");

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(sp.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        // Repository registration
        services.AddScoped<IQACheckpointRepository, QACheckpointRepository>();
        services.AddScoped<IInspectionRepository, InspectionRepository>();
        services.AddScoped<ITicketRepository, TicketRepository>();

        return services;
    }

    /// <summary>
    /// Add QA Application services (MediatR, FluentValidation, etc.).
    /// </summary>
    public static IServiceCollection AddQAApplication(this IServiceCollection services)
    {
        // MediatR registration
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
        });

        // Note: FluentValidation and MediatR pipeline behaviors should be registered in the host application's Program.cs
        // This module only provides the validators and handlers

        return services;
    }
}
