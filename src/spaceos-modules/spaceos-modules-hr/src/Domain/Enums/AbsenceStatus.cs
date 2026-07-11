namespace SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// Absence status - FSM states
/// </summary>
public enum AbsenceStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    InProgress = 4,
    Completed = 5
}
