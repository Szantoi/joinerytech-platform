namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Risk level calculated from 5x5 matrix (Severity × Likelihood)
/// Low: 1-5, Medium: 6-12, High: 15-25
/// </summary>
public enum RiskLevel
{
    /// <summary>RiskScore 1-5: Acceptable with existing controls</summary>
    Low = 1,

    /// <summary>RiskScore 6-12: Requires additional controls</summary>
    Medium = 2,

    /// <summary>RiskScore 15-25: Immediate action required</summary>
    High = 3
}
