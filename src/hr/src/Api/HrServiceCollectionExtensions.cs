using FluentValidation;
using MediatR;
using SpaceOS.Modules.HR.Application.Contracts;
using SpaceOS.Modules.HR.Domain.Services;
using SpaceOS.Modules.HR.Infrastructure;
using SpaceOS.Modules.HR.Infrastructure.Persistence;

namespace SpaceOS.Modules.HR.Api;

/// <summary>
/// HR module service registration (EHS EhsServiceCollectionExtensions precedent).
/// </summary>
public static class HrServiceCollectionExtensions
{
    /// <summary>
    /// Registers every HR module service: tenant context, DbContext + RLS interceptor,
    /// repositories, the config-driven capacity service, MediatR handlers and validators.
    /// </summary>
    public static IServiceCollection AddHrModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // 1. HttpContextAccessor (required by HttpTenantContext)
        services.AddHttpContextAccessor();

        // 2. Tenant context (X-Tenant-Id header → RLS session context)
        services.AddScoped<ITenantContext, HttpTenantContext>();

        // 3. DbContext + repositories + RLS interceptor (Infrastructure layer)
        services.AddHRInfrastructure(configuration);

        // 4. Capacity thresholds — CONFIG-DRIVEN (section "Hr:Capacity", keys:
        //    WorkdaysPerWeek / OverloadEpsilon / UtilizationWarnThreshold; missing keys
        //    fall back to the domain defaults 5 / 0.01 / 0.85). Invalid configuration
        //    fails fast at startup (the value object's constructor throws).
        var capacitySection = configuration.GetSection("Hr:Capacity");
        var capacityConfiguration = new HrCapacityConfiguration(
            capacitySection.GetValue("WorkdaysPerWeek", HrCapacityConfiguration.Default.WorkdaysPerWeek),
            capacitySection.GetValue("OverloadEpsilon", HrCapacityConfiguration.Default.OverloadEpsilon),
            capacitySection.GetValue("UtilizationWarnThreshold", HrCapacityConfiguration.Default.UtilizationWarnThreshold));

        services.AddSingleton(capacityConfiguration);
        services.AddSingleton<ICapacityCalculationService>(
            _ => new CapacityCalculationService(capacityConfiguration));

        services.AddSingleton<IVacationEntitlementService, VacationEntitlementService>();

        // 5. MediatR (CQRS handlers) — the HR Application layer shares the module assembly.
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(HRDbContext).Assembly));

        // 6. FluentValidation (command validators)
        services.AddValidatorsFromAssembly(typeof(HRDbContext).Assembly);

        return services;
    }
}
