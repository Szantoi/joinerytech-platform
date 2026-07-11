namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Inspection status (FSM states)
/// </summary>
public enum InspectionStatus
{
    Planned = 0,     // Tervezett
    InProgress = 1,  // Folyamatban
    Completed = 2    // Lezárt
}
