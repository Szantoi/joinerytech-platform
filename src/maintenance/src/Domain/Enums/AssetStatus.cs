namespace SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// Asset status (COMPUTED, NEVER STORED)
/// </summary>
public enum AssetStatus
{
    Operational = 0,  // Asset működik
    Maintenance = 1,  // Karbantartás alatt (InProgress WO with RequiresDowntime=true)
    Breakdown = 2,    // Géptörés (InProgress corrective WO with RequiresDowntime=true)
    Retired = 3       // Selejtezve
}
