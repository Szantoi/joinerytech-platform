using System.Text.Json;
using System.Text.Json.Serialization;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.Serialization;

/// <summary>
/// SkillLevel travels as a NUMBER (1|2|3) on the wire — the portal schema is
/// z.union([z.literal(1), z.literal(2), z.literal(3)]), a deliberate exception from the
/// string-enum convention (ADR-060 §5 / ADR-059). Applied as a property-level attribute
/// on the DTOs, so it wins over the host's global JsonStringEnumConverter.
/// </summary>
public sealed class SkillLevelWireConverter : JsonConverter<SkillLevel>
{
    public override SkillLevel Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.Number || !reader.TryGetInt32(out var value))
            throw new JsonException("Skill level must be a number (1 = basic, 2 = proficient, 3 = master)");

        if (!Enum.IsDefined(typeof(SkillLevel), value))
            throw new JsonException($"Invalid skill level: {value} (expected 1, 2 or 3)");

        return (SkillLevel)value;
    }

    public override void Write(Utf8JsonWriter writer, SkillLevel value, JsonSerializerOptions options)
        => writer.WriteNumberValue((int)value);
}
