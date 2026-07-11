using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;
using SpaceOS.Modules.DMS.Infrastructure.Persistence.Repositories;

namespace SpaceOS.Modules.DMS.Infrastructure;

/// <summary>
/// Dependency injection extension for DMS Infrastructure layer.
/// </summary>
public static class DependencyInjection
{
    /// <summary>
    /// Add DMS Infrastructure services to the dependency injection container.
    /// </summary>
    public static IServiceCollection AddDMSInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // DbContext with RLS interceptor
        services.AddDbContext<DMSDbContext>((sp, options) =>
        {
            var connectionString = configuration.GetConnectionString("DMSDatabase")
                ?? throw new InvalidOperationException("Connection string 'DMSDatabase' not found.");

            options.UseNpgsql(connectionString);
            options.AddInterceptors(sp.GetRequiredService<TenantDbConnectionInterceptor>());
        });

        // Repositories (Document repository is managed separately)
        services.AddScoped<IDocumentCategoryRepository, DocumentCategoryRepository>();
        services.AddScoped<ITagRepository, TagRepository>();

        // RLS Interceptor
        services.AddScoped<TenantDbConnectionInterceptor>();

        return services;
    }

    /// <summary>
    /// Add DMS Application services (MediatR, FluentValidation, etc.).
    /// </summary>
    public static IServiceCollection AddDMSApplication(this IServiceCollection services)
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
