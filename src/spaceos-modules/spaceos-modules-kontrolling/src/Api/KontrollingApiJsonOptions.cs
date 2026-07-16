namespace SpaceOS.Modules.Kontrolling.Api;

using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// JSON wire-format defaults for the Kontrolling endpoints.
/// </summary>
/// <remarks>
/// The hosting application must call <see cref="AddKontrollingApiJsonOptions"/>
/// (Maintenance module precedent) so the module's enums travel as strings in
/// the contract's spelling — see <see cref="KontrollingWire"/>.
/// <see cref="JsonStringEnumConverter"/> is registered last as the fallback for
/// any enum without an explicit map, keeping the EHS "enums as strings"
/// convention intact rather than letting one serialise as a number.
/// </remarks>
public static class KontrollingApiJsonOptions
{
    /// <summary>
    /// Registers the module's minimal-API JSON serializer defaults on the host.
    /// </summary>
    public static IServiceCollection AddKontrollingApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<CostCategory>(KontrollingWire.Category));
            converters.Add(new WireEnumConverter<ProjectLifecycleStatus>(KontrollingWire.Status));
            converters.Add(new WireEnumConverter<AdjustmentScope>(KontrollingWire.Scope));
            converters.Add(new JsonStringEnumConverter());
        });
    }
}
