namespace SpaceOS.Modules.Hosting.Wire;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// The wire spelling of an enum, in both directions.
/// </summary>
/// <remarks>
/// Enums travel as strings, but the island's contract spellings are a
/// TRANSLATION, not a convention (ADR-059: the canonical wire vocabulary is
/// Hungarian, the domain stays English): <c>CostCategory.Material</c> is
/// <c>"anyag"</c> on the wire, <c>Department.Production</c> is
/// <c>"gyartas"</c>. No naming policy derives those, so each module writes its
/// map out explicitly and that map is the single place the wire vocabulary is
/// defined — the JSON converters and the query-string binding both read it.
/// (Lifted verbatim from the kontrolling precedent, ADR-059 / ADR-061 §3.)
/// </remarks>
public sealed class EnumWireMap<TEnum> where TEnum : struct, Enum
{
    private readonly IReadOnlyDictionary<TEnum, string> _toWire;
    private readonly IReadOnlyDictionary<string, TEnum> _fromWire;

    /// <exception cref="ArgumentException">
    /// A member of <typeparamref name="TEnum"/> has no spelling, or two
    /// members share one. Enforced so that adding a member without a wire name
    /// fails at startup rather than silently serialising something the client
    /// cannot parse (ADR-059 fail-fast rule).
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

        var duplicates = toWire.GroupBy(kvp => kvp.Value, StringComparer.Ordinal)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();
        if (duplicates.Count > 0)
        {
            throw new ArgumentException(
                $"{typeof(TEnum).Name} wire spellings used more than once: {string.Join(", ", duplicates)}.",
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

    /// <summary>
    /// Replaces every whole-word occurrence of an enum member NAME in
    /// <paramref name="text"/> with its wire spelling.
    /// </summary>
    /// <remarks>
    /// Domain error messages interpolate enum values with their English member
    /// names (<c>$"Cannot transition from {Status} to {target}"</c>). The
    /// domain stays wire-agnostic, so the API seam translates the vocabulary
    /// before the message leaves on a 400/409 body (ADR-059: status names in
    /// error messages are wire keys).
    /// </remarks>
    public string TranslateNames(string text)
    {
        foreach (var (value, wire) in _toWire)
        {
            text = System.Text.RegularExpressions.Regex.Replace(
                text, $@"\b{System.Text.RegularExpressions.Regex.Escape(value.ToString())}\b", wire);
        }

        return text;
    }
}
