namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Risk assessment lifecycle status
/// </summary>
public enum RiskStatus
{
    /// <summary>Active risk requiring monitoring and controls</summary>
    Active = 1,

    /// <summary>Risk mitigated or no longer relevant</summary>
    Archived = 2
}
