namespace SpaceOS.Modules.Kontrolling.Api;

using System.Reflection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Kontrolling.Application.Portfolio;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Enums;
using SpaceOS.Modules.Kontrolling.Infrastructure;
using SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;
using SpaceOS.Modules.Kontrolling.Infrastructure.Portfolio;

/// <summary>
/// Registers the Kontrolling module on a host (EHS
/// <c>EhsServiceCollectionExtensions</c> precedent).
/// </summary>
public static class KontrollingServiceCollectionExtensions
{
    /// <summary>
    /// Registers everything the module needs: JSON wire format, MediatR
    /// handlers, validators, the configured thresholds, the project source,
    /// and the persistence layer.
    /// </summary>
    /// <remarks>
    /// Configuration is read eagerly and invalid values throw here, at startup —
    /// a misconfigured threshold must not surface later as a quietly wrong KPI.
    /// </remarks>
    public static IServiceCollection AddKontrollingModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddKontrollingApiJsonOptions();

        // Tenant scope of the request — the RLS interceptor depends on it.
        services.AddHttpContextAccessor();
        services.AddScoped<ITenantContext, HttpTenantContext>();

        // Read-model thresholds — config-driven, fail fast (EHS RiskBandConfiguration precedent).
        services.AddSingleton(BindThresholds(configuration));

        // Interim project source — see IProjectPortfolioSource for why this is a port.
        var projectOptions = new ProjectPortfolioOptions();
        configuration.GetSection(ProjectPortfolioOptions.SectionName).Bind(projectOptions);
        services.AddSingleton(projectOptions);
        services.AddSingleton<IProjectPortfolioSource, ConfiguredProjectPortfolioSource>();

        services.AddSingleton(TimeProvider.System);
        services.AddMemoryCache();

        // The module's native (pre-contract) cost queries. Still registered
        // because MediatR scans the whole assembly and their handlers must be
        // resolvable; both of these are stubs awaiting the same cross-module
        // integration as IProjectPortfolioSource.
        services.AddScoped<IIntegrationDataProvider, IntegrationDataProvider>();
        services.AddScoped<IProjectCostCalculationService, ProjectCostCalculationService>();

        services.AddMediatR(cfg =>
            cfg.RegisterServicesFromAssembly(typeof(ListProjectsQuery).Assembly));

        // NOTE: the module's FluentValidation validators are deliberately NOT
        // registered — there is no validation pipeline behaviour to run them,
        // so registering them would only look like validation was happening.
        // The command handlers guard their own invariants and return 400.
        // Wiring a ValidationBehavior is a documented follow-up.

        services.AddKontrollingInfrastructure(configuration);

        return services;
    }

    /// <summary>
    /// Binds <see cref="PortfolioThresholds"/> from
    /// <c>Kontrolling:Portfolio</c>, falling back to the defaults per key.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// A configured lifecycle label is not a known one.
    /// </exception>
    private static PortfolioThresholds BindThresholds(IConfiguration configuration)
    {
        var section = configuration.GetSection(PortfolioThresholds.SectionName);
        var defaults = PortfolioThresholds.Default;

        var statuses = section.GetSection("AtRiskStatuses").Get<string[]>();

        return new PortfolioThresholds(
            section.GetValue("AtRiskMarginThreshold", defaults.AtRiskMarginThreshold),
            statuses is null or { Length: 0 }
                ? defaults.AtRiskStatuses
                : statuses.Select(ParseStatus));

        static ProjectLifecycleStatus ParseStatus(string name) =>
            Enum.TryParse<ProjectLifecycleStatus>(name, ignoreCase: true, out var status)
                ? status
                : throw new InvalidOperationException(
                    $"{PortfolioThresholds.SectionName}:AtRiskStatuses contains an unknown " +
                    $"lifecycle label '{name}'. Known labels: " +
                    $"{string.Join(", ", Enum.GetNames<ProjectLifecycleStatus>())}.");
    }
}
