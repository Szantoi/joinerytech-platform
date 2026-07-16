namespace SpaceOS.Modules.Kontrolling.Api;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using System.Text.Json.Serialization;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// The wire spelling of an enum, in both directions.
/// </summary>
/// <remarks>
/// Enums travel as strings (the EHS/QA/Maintenance precedent), but the
/// controlling contract's spellings are a TRANSLATION, not a convention:
/// <c>CostCategory.Material</c> is <c>"anyag"</c> on the wire, and
/// <c>OnHold</c> is <c>"on_hold"</c>. No naming policy derives those, so the
/// map is written out explicitly and is the single place the wire vocabulary
/// is defined — the JSON converters and the query-string binding both read it.
/// </remarks>
public sealed class EnumWireMap<TEnum> where TEnum : struct, Enum
{
    private readonly IReadOnlyDictionary<TEnum, string> _toWire;
    private readonly IReadOnlyDictionary<string, TEnum> _fromWire;

    /// <exception cref="ArgumentException">
    /// A member of <typeparamref name="TEnum"/> has no spelling. Enforced so
    /// that adding a member without a wire name fails at startup rather than
    /// silently serialising something the client cannot parse.
    /// </exception>
    public EnumWireMap(IReadOnlyDictionary<TEnum, string> toWire)
    {
        var missing = Enum.GetValues<TEnum>().Where(v => !toWire.ContainsKey(v)).ToList();
        if (missing.Count > 0)
        {
            throw new ArgumentException(
                $"{typeof(TEnum).Name} members without a wire spelling: {string.Join(", ", missing)}.",
                nameof(toWire));
        }

        _toWire = toWire;
        _fromWire = toWire.ToDictionary(kvp => kvp.Value, kvp => kvp.Key, StringComparer.Ordinal);
    }

    /// <summary>The wire spelling of a value.</summary>
    public string ToWire(TEnum value) => _toWire[value];

    /// <summary>Parses a wire spelling. Case-sensitive: the contract is exact.</summary>
    public bool TryParse(string? wire, [NotNullWhen(true)] out TEnum value)
    {
        if (wire is not null && _fromWire.TryGetValue(wire, out value))
        {
            return true;
        }

        value = default;
        return false;
    }

    /// <summary>Every accepted spelling — for error messages.</summary>
    public IEnumerable<string> Spellings => _fromWire.Keys;
}

/// <summary>
/// The controlling module's wire vocabulary.
/// </summary>
public static class KontrollingWire
{
    /// <summary>Canonical Hungarian cost-category keys.</summary>
    public static readonly EnumWireMap<CostCategory> Category = new(
        new Dictionary<CostCategory, string>
        {
            [CostCategory.Material] = "anyag",
            [CostCategory.Labor] = "munka",
            [CostCategory.Subcontracting] = "bermunka",
            [CostCategory.Logistics] = "szallitas",
            [CostCategory.Supplier] = "beszallito",
            [CostCategory.Overhead] = "rezsi"
        });

    /// <summary>Project lifecycle labels.</summary>
    public static readonly EnumWireMap<ProjectLifecycleStatus> Status = new(
        new Dictionary<ProjectLifecycleStatus, string>
        {
            [ProjectLifecycleStatus.Draft] = "draft",
            [ProjectLifecycleStatus.Active] = "active",
            [ProjectLifecycleStatus.Install] = "install",
            [ProjectLifecycleStatus.Done] = "done",
            [ProjectLifecycleStatus.OnHold] = "on_hold"
        });

    /// <summary>Cost-adjustment scopes.</summary>
    public static readonly EnumWireMap<AdjustmentScope> Scope = new(
        new Dictionary<AdjustmentScope, string>
        {
            [AdjustmentScope.Project] = "project",
            [AdjustmentScope.Portfolio] = "portfolio"
        });
}

/// <summary>
/// Serialises an enum using its <see cref="EnumWireMap{TEnum}"/> spelling.
/// </summary>
/// <remarks>
/// An unparseable value throws <see cref="JsonException"/>, which the minimal
/// API pipeline surfaces as 400 — the contract's answer for a bad payload.
/// </remarks>
public sealed class WireEnumConverter<TEnum>(EnumWireMap<TEnum> map)
    : JsonConverter<TEnum> where TEnum : struct, Enum
{
    public override TEnum Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var wire = reader.TokenType == JsonTokenType.String
            ? reader.GetString()
            : throw new JsonException(
                $"{typeof(TEnum).Name} must be a string, got {reader.TokenType}.");

        return map.TryParse(wire, out var value)
            ? value
            : throw new JsonException(
                $"Unknown {typeof(TEnum).Name} '{wire}'. Expected one of: {string.Join(", ", map.Spellings)}.");
    }

    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
        => writer.WriteStringValue(map.ToWire(value));
}
