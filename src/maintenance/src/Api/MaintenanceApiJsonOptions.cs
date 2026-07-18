using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Api;

/// <summary>
/// JSON wire-format defaults for the Maintenance module endpoints.
/// The hosting application must call <see cref="AddMaintenanceApiJsonOptions"/>
/// so the module's enums travel as strings in the contract's spelling — see
/// <see cref="MaintenanceWire"/> (ADR-059: Hungarian wire keys, e.g. Status:
/// "utemezve"). <see cref="JsonStringEnumConverter"/> is registered LAST as the
/// fallback for any enum without an explicit map, keeping the "enums as
/// strings" convention intact rather than letting one serialise as a number.
/// </summary>
public static class MaintenanceApiJsonOptions
{
    /// <summary>
    /// Registers the module's minimal-API JSON serializer defaults on the host.
    /// </summary>
    public static IServiceCollection AddMaintenanceApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<AssetKind>(MaintenanceWire.AssetKind));
            converters.Add(new WireEnumConverter<AssetStatus>(MaintenanceWire.AssetStatus));
            converters.Add(new WireEnumConverter<MaintenanceTrigger>(MaintenanceWire.MaintenanceTrigger));
            converters.Add(new WireEnumConverter<WorkOrderStatus>(MaintenanceWire.WorkOrderStatus));
            converters.Add(new WireEnumConverter<WorkOrderType>(MaintenanceWire.WorkOrderType));
            converters.Add(new WireEnumConverter<WorkOrderPriority>(MaintenanceWire.WorkOrderPriority));
            converters.Add(new WireEnumConverter<AssignmentType>(MaintenanceWire.AssignmentType));
            converters.Add(new JsonStringEnumConverter());
        });
    }
}
