namespace SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// Work order type
/// </summary>
public enum WorkOrderType
{
    Corrective = 0,  // Breakdown repair
    Preventive = 1,  // Scheduled maintenance
    Cleaning = 2     // Cleaning
}
