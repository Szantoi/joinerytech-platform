namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Severity scale (1-5) for risk assessment and incidents
/// ISO 45001 compatible
/// </summary>
public enum Severity
{
    /// <summary>No injury or minor damage</summary>
    Negligible = 1,

    /// <summary>Minor injury requiring first aid</summary>
    Minor = 2,

    /// <summary>Medical treatment required</summary>
    Moderate = 3,

    /// <summary>Serious injury or significant property damage</summary>
    Major = 4,

    /// <summary>Fatality or severe permanent injury</summary>
    Catastrophic = 5
}
