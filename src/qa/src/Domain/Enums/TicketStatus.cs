namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Ticket status (FSM states)
/// </summary>
public enum TicketStatus
{
    Reported = 0,    // Bejelentve
    Assigned = 1,    // Kiosztva
    InProgress = 2,  // Folyamatban
    Resolved = 3,    // Megoldva
    Rejected = 4     // Elutasítva
}
