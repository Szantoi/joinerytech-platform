using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Modules;
using SpaceOS.Modules.Maintenance.Api;
using SpaceOS.Modules.Maintenance.Api.Endpoints;
using SpaceOS.Modules.Maintenance.Infrastructure;
using SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

namespace SpaceOS.Modules.Maintenance.Hosting;

/// <summary>Shared-host composition contract for the Maintenance module package.</summary>
public sealed class MaintenanceModuleBootstrap : ISpaceOsModuleBootstrap
{
    private static readonly System.Reflection.Assembly ModuleAssembly = typeof(MaintenanceModuleBootstrap).Assembly;

    public ModuleDescriptor Descriptor { get; } = new(
        moduleId: "spaceos.maintenance",
        version: ModuleAssembly.GetName().Version?.ToString() ?? "0.0.0",
        migrationsAssembly: typeof(MaintenanceDbContext).Assembly.GetName().Name
            ?? throw new InvalidOperationException("Maintenance migrations assembly name is unavailable."));

    public void ConfigureModuleServices(IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddMaintenanceApiJsonOptions();
        services.AddMaintenanceInfrastructure(configuration);
    }

    public void MapModuleEndpoints(IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);
        endpoints.MapAssetEndpoints();
        endpoints.MapWorkOrderEndpoints();
    }
}
