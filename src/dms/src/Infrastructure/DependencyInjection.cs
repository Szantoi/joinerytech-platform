using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SpaceOS.Modules.DMS.Application.Configuration;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Infrastructure.Blob;
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

        // Repositories
        services.AddScoped<IDocumentRepository, DocumentRepository>();
        services.AddScoped<IDocumentCategoryRepository, DocumentCategoryRepository>();
        services.AddScoped<ITagRepository, TagRepository>();

        // RLS Interceptor
        services.AddScoped<TenantDbConnectionInterceptor>();

        // Blob store — filesystem stub behind the IDocumentBlobStore port
        // (the real store is an infra decision, follow-up). Root is CONFIG-DRIVEN.
        services.AddSingleton<IDocumentBlobStore>(sp => new FileSystemDocumentBlobStore(
            configuration[FileSystemDocumentBlobStore.RootPathConfigKey]
                ?? FileSystemDocumentBlobStore.DefaultRootPath,
            sp.GetRequiredService<ILogger<FileSystemDocumentBlobStore>>()));

        // Expiry-watch window — CONFIG-DRIVEN (Dms:Expiry:WarnDays; portal
        // EXPIRY_WARN_DAYS mirror as fallback — EHS RiskBandConfiguration precedent)
        services.AddSingleton(new DmsExpiryOptions(
            configuration.GetSection(DmsExpiryOptions.SectionName)
                .GetValue("WarnDays", DmsExpiryOptions.Default.WarnDays)));

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
