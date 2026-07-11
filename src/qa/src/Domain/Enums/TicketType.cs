namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Ticket type
/// </summary>
public enum TicketType
{
    Warranty = 0,    // Garancia (gyártási hiba)
    Repair = 1,      // Hiánypótlás/javítás
    Missing = 2      // Hiányzó alkatrész
}
