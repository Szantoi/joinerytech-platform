namespace SpaceOS.Modules.Maintenance.Domain.Enums;

/// <summary>
/// Work order status (FSM)
/// </summary>
public enum WorkOrderStatus
{
    Reported = 0,    // Bejelentve
    Scheduled = 1,   // Ütemezve
    InProgress = 2,  // Folyamatban
    Completed = 3,   // Befejezve
    Postponed = 4,   // Elhalasztva
    Rejected = 5     // Elutasítva
}
