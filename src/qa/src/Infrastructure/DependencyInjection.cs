using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
    public static IServiceCollection AddQAInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext with interceptor
        services.AddScoped<ITenantContext>(sp => new DefaultTenantContext());
        services.AddScoped<TenantDbConnectionInterceptor>();

        services.AddDbContext<QADbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("QA") ?? "Host=localhost;Database=qa;Username=postgres;Password=postgres";
            var interceptor = sp.GetRequiredService<TenantDbConnectionInterceptor>();

            options
                .UseNpgsql(connectionString)
                .AddInterceptors(interceptor);
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

/// <summary>
/// Default tenant context implementation (placeholder).
/// </summary>
internal class DefaultTenantContext : ITenantContext
{
    public Guid TenantId => Guid.Empty; // Will be set by interceptor
}
