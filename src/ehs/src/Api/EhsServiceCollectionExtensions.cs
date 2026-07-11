using System.Reflection;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using SpaceOS.Modules.Ehs.Infrastructure.Notifications;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;

namespace SpaceOS.Modules.Ehs.Api;

/// <summary>
/// Extension methods for EHS module service registration.
/// </summary>
public static class EhsServiceCollectionExtensions
{
    /// <summary>
    /// Registers all EHS module services (DbContext, Repositories, MediatR, AutoMapper, Validators).
    /// </summary>
    public static IServiceCollection AddEhsModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. HttpContextAccessor (required for HttpTenantContext)
        services.AddHttpContextAccessor();

        // 2. Tenant Context
        services.AddScoped<ITenantContext, HttpTenantContext>();

        // 3. DbContext + RLS Interceptor
        services.AddDbContext<EhsDbContext>((serviceProvider, options) =>
        {
            var connectionString = configuration.GetConnectionString("EhsDatabase")
                ?? throw new InvalidOperationException("EhsDatabase connection string is missing.");

            var tenantContext = serviceProvider.GetRequiredService<ITenantContext>();
            var interceptor = new TenantDbConnectionInterceptor(tenantContext);

            options.UseNpgsql(connectionString)
                   .AddInterceptors(interceptor);
        });

        // 4. Repositories
        services.AddScoped<IIncidentRepository, IncidentRepository>();
        services.AddScoped<IRiskAssessmentRepository, RiskAssessmentRepository>();
        services.AddScoped<ITrainingRecordRepository, TrainingRecordRepository>();

        // 5. Notification Service
        services.AddScoped<IEhsNotificationService, EhsNotificationService>();

        // 6. MediatR (CQRS handlers)
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(
                Assembly.Load("SpaceOS.Modules.Ehs.Application"));
        });

        // 7. AutoMapper (Domain → DTO mapping)
        services.AddAutoMapper(
            Assembly.Load("SpaceOS.Modules.Ehs.Application"));

        // 8. FluentValidation (Command validators)
        services.AddValidatorsFromAssembly(
            Assembly.Load("SpaceOS.Modules.Ehs.Application"));

        return services;
    }
}
