namespace SpaceOS.Modules.QA.Api;

using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// JSON wire-format defaults for the QA endpoints.
/// </summary>
/// <remarks>
/// The hosting application must call <see cref="AddQaApiJsonOptions"/>
/// (kontrolling precedent) so the module's enums travel as strings in the
/// contract's spelling — see <see cref="QaWire"/>. An unknown spelling in a
/// request body throws <see cref="System.Text.Json.JsonException"/>, which the
/// minimal API pipeline surfaces as 400. <see cref="JsonStringEnumConverter"/>
/// is registered LAST as the fallback for any enum without an explicit map,
/// keeping the "enums as strings" convention intact rather than letting one
/// serialise as a number.
/// </remarks>
public static class QaApiJsonOptions
{
    /// <summary>
    /// Registers the module's minimal-API JSON serializer defaults on the host.
    /// </summary>
    public static IServiceCollection AddQaApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<InspectionStatus>(QaWire.InspectionStatus));
            converters.Add(new WireEnumConverter<InspectionResult>(QaWire.InspectionResult));
            converters.Add(new WireEnumConverter<CheckpointType>(QaWire.CheckpointType));
            converters.Add(new WireEnumConverter<CriteriaType>(QaWire.CriteriaType));
            converters.Add(new WireEnumConverter<CriticalLevel>(QaWire.CriticalLevel));
            converters.Add(new WireEnumConverter<FailureType>(QaWire.FailureType));
            converters.Add(new WireEnumConverter<TicketStatus>(QaWire.TicketStatus));
            converters.Add(new WireEnumConverter<TicketType>(QaWire.TicketType));
            converters.Add(new WireEnumConverter<CrmTaskPriority>(QaWire.Priority));
            converters.Add(new WireEnumConverter<ActionType>(QaWire.ActionType));
            converters.Add(new JsonStringEnumConverter());
        });
    }
}
