namespace SpaceOS.Modules.Ehs.Application.Wire;

using System.Text.Json.Serialization;
using SpaceOS.Modules.Hosting.Wire;
using Enums = SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Registers a <see cref="WireEnumConverter{TEnum}"/> for every EHS wire map,
/// so JSON bodies and responses speak the canonical Hungarian vocabulary
/// (<see cref="EhsWire"/>, ADR-059). An unknown key throws
/// <see cref="System.Text.Json.JsonException"/>, which the minimal API
/// pipeline surfaces as 400.
/// </summary>
/// <remarks>
/// System.Text.Json only — no ASP.NET dependency, so the same registration is
/// used by the host (Program.cs) and by unit tests building bare
/// <see cref="System.Text.Json.JsonSerializerOptions"/>.
/// </remarks>
public static class EhsWireConverters
{
    /// <summary>Adds one converter per EHS enum (all 14 maps of <see cref="EhsWire"/>).</summary>
    public static void AddEhsWireConverters(this IList<JsonConverter> converters)
    {
        converters.Add(new WireEnumConverter<Enums.IncidentType>(EhsWire.IncidentType));
        converters.Add(new WireEnumConverter<Enums.IncidentStatus>(EhsWire.IncidentStatus));
        converters.Add(new WireEnumConverter<Enums.Severity>(EhsWire.Severity));
        converters.Add(new WireEnumConverter<Enums.Likelihood>(EhsWire.Likelihood));
        converters.Add(new WireEnumConverter<Enums.RiskLevel>(EhsWire.RiskLevel));
        converters.Add(new WireEnumConverter<Enums.RiskStatus>(EhsWire.RiskStatus));
        converters.Add(new WireEnumConverter<Enums.LocationKind>(EhsWire.LocationKind));
        converters.Add(new WireEnumConverter<Enums.MaterialStatus>(EhsWire.MaterialStatus));
        converters.Add(new WireEnumConverter<Enums.SdsValidity>(EhsWire.SdsValidity));
        converters.Add(new WireEnumConverter<Enums.TrainingStatus>(EhsWire.TrainingStatus));
        converters.Add(new WireEnumConverter<Enums.PpeCategory>(EhsWire.PpeCategory));
        converters.Add(new WireEnumConverter<Enums.PpeIssuanceStatus>(EhsWire.PpeIssuanceStatus));
        converters.Add(new WireEnumConverter<Enums.SafetyWalkStatus>(EhsWire.SafetyWalkStatus));
        converters.Add(new WireEnumConverter<Enums.CapaSource>(EhsWire.CapaSource));
    }
}
