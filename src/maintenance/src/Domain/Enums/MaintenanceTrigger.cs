namespace SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// Maintenance trigger type
/// </summary>
public enum MaintenanceTrigger
{
    Interval = 0,       // Days-based (e.g., every 30 days)
    OperatingHours = 1  // Hours-based (e.g., every 500 hours)
}
