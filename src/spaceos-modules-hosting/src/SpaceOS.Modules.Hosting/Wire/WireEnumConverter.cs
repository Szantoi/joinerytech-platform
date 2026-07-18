namespace SpaceOS.Modules.Hosting.Wire;

using System.Text.Json;
using System.Text.Json.Serialization;

/// <summary>
/// Serialises an enum using its <see cref="EnumWireMap{TEnum}"/> spelling.
/// </summary>
/// <remarks>
/// An unparseable value throws <see cref="JsonException"/>, which the minimal
/// API pipeline surfaces as 400 — the contract's answer for a bad payload.
/// (Kontrolling precedent, promoted to the shared hosting package — ADR-059.)
/// </remarks>
public sealed class WireEnumConverter<TEnum>(EnumWireMap<TEnum> map)
    : JsonConverter<TEnum> where TEnum : struct, Enum
{
    /// <summary>Parses the wire spelling; unknown spelling → <see cref="JsonException"/> (→ 400).</summary>
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

    /// <summary>Writes the value's wire spelling.</summary>
    public override void Write(Utf8JsonWriter writer, TEnum value, JsonSerializerOptions options)
        => writer.WriteStringValue(map.ToWire(value));
}
