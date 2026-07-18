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
        // 1-3. DbContext + repositories + shared tenancy (ADR-061): the claims-backed
        // tenant context, its Application.Contracts.ITenantContext adapter and the shared
        // fail-loud RLS interceptor are registered inside AddHRInfrastructure. The
        // header-reading HttpTenantContext is gone.
        services.AddHRInfrastructure(configuration);

        // 3b. Pay grade hourly rates — CONFIG-DRIVEN (section "Hr:PayGrades", keys:
        //     Helper/SkilledWorker/Master/Engineer/Lead; missing keys fall back to the
        //     domain defaults = portal HR_PAY_GRADE_META mirror). Invalid values fail
        //     fast on first handler resolution (ADR-060, options pattern).
        services.Configure<Application.Configuration.HrPayGradesOptions>(
            configuration.GetSection(Application.Configuration.HrPayGradesOptions.SectionName));

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
