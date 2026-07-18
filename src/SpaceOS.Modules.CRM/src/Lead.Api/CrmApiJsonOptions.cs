using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using SpaceOS.Modules.CRM.Application.Wire;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.Hosting.Wire;

namespace SpaceOS.Modules.CRM.Api;

/// <summary>
/// JSON wire-format defaults for the CRM module endpoints
/// (kontrolling <c>KontrollingApiJsonOptions</c> precedent).
///
/// Enums travel as the portal's canonical Hungarian wire keys via the shared
/// <see cref="WireEnumConverter{TEnum}"/> seam (ADR-059 — see
/// <see cref="CrmWire"/>): LeadStatus "nurturing", OpportunityStatus
/// "targyalas", etc. Unknown keys throw JsonException → 400; parsing is
/// case-sensitive (the contract is exact). <see cref="JsonStringEnumConverter"/>
/// is registered LAST as the fallback for any enum without an explicit map.
/// </summary>
public static class CrmApiJsonOptions
{
    /// <summary>Registers the module's minimal-API JSON serializer defaults on the host.</summary>
    public static IServiceCollection AddCrmApiJsonOptions(this IServiceCollection services)
    {
        return services.ConfigureHttpJsonOptions(options =>
        {
            var converters = options.SerializerOptions.Converters;
            converters.Add(new WireEnumConverter<LeadStatus>(CrmWire.LeadStatus));
            converters.Add(new WireEnumConverter<LeadSource>(CrmWire.LeadSource));
            converters.Add(new WireEnumConverter<OpportunityStatus>(CrmWire.OpportunityStatus));
            converters.Add(new WireEnumConverter<TaskSla>(CrmWire.TaskSla));
            converters.Add(new WireEnumConverter<CrmRefType>(CrmWire.RefType));
            converters.Add(new JsonStringEnumConverter());
        });
    }
}
