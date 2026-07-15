namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Source of a corrective action (unified CAPA mechanism).
/// Every CAPA — regardless of origin — lives in the same registry so the
/// portal can render a single CAPA board.
/// </summary>
public enum CapaSource
{
    /// <summary>Corrective action spawned by an incident investigation</summary>
    Incident = 1,

    /// <summary>Corrective action spawned by a safety walk finding</summary>
    SafetyWalk = 2,

    /// <summary>Corrective action spawned by a risk assessment (reserved)</summary>
    RiskAssessment = 3
}
