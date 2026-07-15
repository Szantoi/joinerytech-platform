namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Risk level calculated from the 5×5 matrix (Severity × Likelihood).
/// Band boundaries are CONFIG-DRIVEN — see <see cref="Aggregates.RiskAssessmentAggregate.RiskBandConfiguration"/>
/// (defaults: Low 1-4, Medium 5-9, High 10-16, Critical 17-25; overridable via Ehs:RiskMatrix:Bands).
/// </summary>
public enum RiskLevel
{
    /// <summary>Acceptable with existing controls (alacsony)</summary>
    Low = 1,

    /// <summary>Requires additional controls (közepes)</summary>
    Medium = 2,

    /// <summary>Prioritized action required (magas)</summary>
    High = 3,

    /// <summary>Immediate action required — stop work if needed (kritikus)</summary>
    Critical = 4
}
