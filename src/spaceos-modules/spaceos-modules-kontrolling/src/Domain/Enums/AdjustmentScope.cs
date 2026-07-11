namespace SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Scope of a cost adjustment
/// </summary>
public enum AdjustmentScope
{
    /// <summary>
    /// Adjustment applies to a specific project
    /// </summary>
    Project = 1,

    /// <summary>
    /// Adjustment applies to all projects (portfolio-wide)
    /// </summary>
    Portfolio = 2
}
