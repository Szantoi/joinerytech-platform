using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceOS.Modules.Hosting.Modules;

/// <summary>
/// Package boundary for a module that can be composed into a shared host.
/// The host owns authentication and middleware ordering; the module owns its DI and endpoints.
/// </summary>
public interface ISpaceOsModuleBootstrap
{
    /// <summary>Identity, version and migration assembly supplied to the shared host.</summary>
    ModuleDescriptor Descriptor { get; }

    /// <summary>Registers module-owned services without configuring host middleware.</summary>
    void ConfigureModuleServices(IServiceCollection services, IConfiguration configuration);

    /// <summary>Maps the module's authenticated endpoint groups.</summary>
    void MapModuleEndpoints(IEndpointRouteBuilder endpoints);
}
