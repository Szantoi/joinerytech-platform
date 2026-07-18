using System.Reflection;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.RiskAssessmentAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;
using SpaceOS.Modules.Ehs.Infrastructure.Notifications;
using SpaceOS.Modules.Ehs.Infrastructure.Repositories;
using SpaceOS.Modules.Hosting.Persistence;
using SpaceOS.Modules.Hosting.Tenancy;

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
        // 1-2. Shared tenancy (ADR-061): claims-backed tenant context + RLS session
        // interceptor from SpaceOS.Modules.Hosting; the module-local ITenantContext is an
        // adapter over it. The header-reading HttpTenantContext is gone.
        services.AddSpaceOsModuleTenancy();
        services.AddScoped<Infrastructure.Data.ITenantContext, HostingTenantContextAdapter>();

        // 3. DbContext + shared RLS interceptor (fail-loud — ADR-062)
        services.AddDbContext<EhsDbContext>((serviceProvider, options) =>
        {
            var connectionString = configuration.GetConnectionString("EhsDatabase")
                ?? throw new InvalidOperationException("EhsDatabase connection string is missing.");

            options.UseNpgsql(connectionString)
                   .AddInterceptors(serviceProvider.GetRequiredService<SpaceOsTenantSessionInterceptor>());
        });

        // 4. Repositories
        services.AddScoped<IIncidentRepository, IncidentRepository>();
        services.AddScoped<IRiskAssessmentRepository, RiskAssessmentRepository>();
        services.AddScoped<ITrainingRecordRepository, TrainingRecordRepository>();
        services.AddScoped<IEhsLocationRepository, EhsLocationRepository>();
        services.AddScoped<IHazardousMaterialRepository, HazardousMaterialRepository>();
        services.AddScoped<IPpeItemRepository, PpeItemRepository>();
        services.AddScoped<IPpeIssuanceRepository, PpeIssuanceRepository>();
        services.AddScoped<ISafetyWalkRepository, SafetyWalkRepository>();
        services.AddScoped<ICorrectiveActionRepository, CorrectiveActionRepository>();

        // 5. Notification Service
        services.AddScoped<IEhsNotificationService, EhsNotificationService>();

        // 5b. Risk matrix band boundaries — CONFIG-DRIVEN (section "Ehs:RiskMatrix:Bands",
        // keys: LowMax/MediumMax/HighMax; missing keys fall back to the domain defaults 4/9/16).
        // Invalid configuration fails fast at startup (value object constructor throws).
        var bandsSection = configuration.GetSection("Ehs:RiskMatrix:Bands");
        services.AddSingleton(new RiskBandConfiguration(
            bandsSection.GetValue("LowMax", RiskBandConfiguration.Default.LowMax),
            bandsSection.GetValue("MediumMax", RiskBandConfiguration.Default.MediumMax),
            bandsSection.GetValue("HighMax", RiskBandConfiguration.Default.HighMax)));

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
