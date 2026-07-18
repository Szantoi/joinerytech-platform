namespace SpaceOS.Modules.HR.Api;

using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// JSON wire-format defaults for the HR endpoints.
/// </summary>
/// <remarks>
/// The hosting application must call <see cref="AddHrApiJsonOptions"/>
/// (kontrolling precedent) so the module's enums travel as strings in the
/// contract's Hungarian spelling — see <see cref="HrWire"/>.
/// <see cref="JsonStringEnumConverter"/> is registered LAST as the fallback for
/// any enum without an explicit map, keeping the "enums as strings" convention
/// intact rather than letting one serialise as a number. SkillLevel is NOT
/// registered here: it stays numeric via the property-level
/// SkillLevelWireConverter attribute on the DTOs (ADR-060 §5).
/// </remarks>
public static class HrApiJsonOptions
{
    /// <summary>
    /// Registers the module's minimal-API JSON serializer defaults on the host.
    /// </summary>
    public static IServiceCollection AddHrApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<Department>(HrWire.Department));
            converters.Add(new WireEnumConverter<SkillKey>(HrWire.SkillKey));
            converters.Add(new WireEnumConverter<PayGradeBand>(HrWire.PayGradeBand));
            converters.Add(new WireEnumConverter<AbsenceStatus>(HrWire.AbsenceStatus));
            converters.Add(new WireEnumConverter<AbsenceType>(HrWire.AbsenceType));
            converters.Add(new JsonStringEnumConverter());
        });
    }
}
