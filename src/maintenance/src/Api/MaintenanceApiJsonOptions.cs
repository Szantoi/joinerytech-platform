using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceOS.Modules.Maintenance.Api;

/// <summary>
/// JSON wire-format defaults for the Maintenance module endpoints.
/// The hosting application must call <see cref="AddMaintenanceApiJsonOptions"/>
/// (EHS precedent: JsonStringEnumConverter in Program.cs) so enums travel as
/// strings (e.g. Status: "Scheduled"); integer values remain accepted on input
/// for backward compatibility.
/// </summary>
public static class MaintenanceApiJsonOptions
{
    /// <summary>
    /// Registers the module's minimal-API JSON serializer defaults on the host.
    /// </summary>
    public static IServiceCollection AddMaintenanceApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    }
}
