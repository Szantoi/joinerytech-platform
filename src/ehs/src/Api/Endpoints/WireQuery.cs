using SpaceOS.Modules.Hosting.Wire;

namespace SpaceOS.Modules.Ehs.Api.Endpoints;

/// <summary>
/// Query-string wire-enum binding (ADR-059): [AsParameters] filter records
/// carry the raw string and the handler parses it against the
/// <see cref="Application.Wire.EhsWire"/> map — minimal-API enum binding would
/// accept the English member names, which violates the Hungarian wire contract.
/// An unknown key is a 400 listing the accepted vocabulary, not a silently
/// empty result list (kontrolling precedent).
/// </summary>
internal static class WireQuery
{
    /// <summary>
    /// Parses an optional query-string filter value with the given wire map.
    /// Returns false with a populated <paramref name="error"/> (400) when the
    /// key is unknown; a null/absent value parses to null.
    /// </summary>
    public static bool TryParse<TEnum>(
        EnumWireMap<TEnum> map,
        string? wire,
        string filterLabel,
        out TEnum? value,
        out IResult? error)
        where TEnum : struct, Enum
    {
        value = null;
        error = null;

        if (wire is null)
        {
            return true;
        }

        if (map.TryParse(wire, out var parsed))
        {
            value = parsed;
            return true;
        }

        error = Results.BadRequest(new
        {
            Error = $"Ismeretlen {filterLabel}-kulcs: '{wire}'. " +
                    $"Lehetséges értékek: {string.Join(", ", map.Spellings)}."
        });
        return false;
    }
}
