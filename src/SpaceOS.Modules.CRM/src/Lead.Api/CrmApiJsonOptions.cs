using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;

namespace SpaceOS.Modules.CRM.Api;

/// <summary>
/// JSON wire-format defaults for the CRM module endpoints
/// (Maintenance <c>MaintenanceApiJsonOptions</c> precedent).
///
/// Enums travel as STRINGS (e.g. Status: "Nurturing", Sla: "Overdue") — the
/// module convention set by EHS Program.cs and mirrored by the endpoint tests;
/// integer values remain accepted on input for backward compatibility.
/// </summary>
public static class CrmApiJsonOptions
{
    /// <summary>Registers the module's minimal-API JSON serializer defaults on the host.</summary>
    public static IServiceCollection AddCrmApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    }
}
