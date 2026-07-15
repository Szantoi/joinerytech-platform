namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Hazardous material registry lifecycle status (RiskStatus pattern)
/// </summary>
public enum MaterialStatus
{
    /// <summary>Material in active use on site</summary>
    Active = 1,

    /// <summary>Material phased out / no longer stored on site</summary>
    Archived = 2
}
