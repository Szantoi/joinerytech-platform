// Ehs.Domain/ValueObjects/IncidentType.cs

namespace Ehs.Domain.ValueObjects;

/// <summary>
/// Enum representing incident severity types for EHS reporting.
/// </summary>
public enum IncidentType
{
    /// <summary>Near-miss incident (no injury/damage)</summary>
    NearMiss = 0,

    /// <summary>Personal injury incident</summary>
    Injury = 1,

    /// <summary>Property damage incident</summary>
    Property = 2
}

/// <summary>
/// Extension methods for IncidentType enum.
/// </summary>
public static class IncidentTypeExtensions
{
    public static string ToApiString(this IncidentType type) => type switch
    {
        IncidentType.NearMiss => "near-miss",
        IncidentType.Injury => "injury",
        IncidentType.Property => "property",
        _ => throw new ArgumentOutOfRangeException(nameof(type), type, "Invalid incident type")
    };

    public static IncidentType FromApiString(string value) => value?.ToLowerInvariant() switch
    {
        "near-miss" => IncidentType.NearMiss,
        "injury" => IncidentType.Injury,
        "property" => IncidentType.Property,
        _ => throw new ArgumentException($"Invalid incident type: {value}", nameof(value))
    };
}
