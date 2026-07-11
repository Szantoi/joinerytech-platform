namespace JoineryTech.HR.Domain.Enums;

/// <summary>
/// Absence status enum - FSM states for vacation/leave request lifecycle
/// </summary>
public enum AbsenceStatus
{
    /// <summary>
    /// Initial state - newly created absence request awaiting approval
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Manager approved the absence request
    /// Blocks capacity on scheduled dates
    /// </summary>
    Approved = 1,

    /// <summary>
    /// Absence has started (employee is currently absent)
    /// Blocks capacity on scheduled dates
    /// </summary>
    InProgress = 2,

    /// <summary>
    /// Absence finished successfully
    /// Terminal state - blocks capacity on historical dates (for balance calculation)
    /// </summary>
    Completed = 3,

    /// <summary>
    /// Manager rejected the absence request (reason required)
    /// Terminal state - does NOT block capacity
    /// Can be reopened to Pending
    /// </summary>
    Rejected = 4
}

/// <summary>
/// FSM Transition Validator for Absence
/// </summary>
public static class AbsenceStatusTransitions
{
    private static readonly Dictionary<AbsenceStatus, HashSet<AbsenceStatus>> _validTransitions = new()
    {
        { AbsenceStatus.Pending, new() { AbsenceStatus.Approved, AbsenceStatus.Rejected } },
        { AbsenceStatus.Approved, new() { AbsenceStatus.InProgress } },
        { AbsenceStatus.InProgress, new() { AbsenceStatus.Completed } },
        { AbsenceStatus.Rejected, new() { AbsenceStatus.Pending } }, // Can reopen
        { AbsenceStatus.Completed, new() } // Terminal state
    };

    public static bool IsValidTransition(AbsenceStatus from, AbsenceStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    public static HashSet<AbsenceStatus> GetAllowedTransitions(AbsenceStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<AbsenceStatus>();
    }

    /// <summary>
    /// Check if status blocks employee capacity (removes availability on scheduled dates)
    /// </summary>
    public static bool IsBlockingStatus(AbsenceStatus status)
    {
        return status is AbsenceStatus.Approved or AbsenceStatus.InProgress or AbsenceStatus.Completed;
    }

    /// <summary>
    /// Check if status is a terminal state (cannot transition further)
    /// </summary>
    public static bool IsTerminalState(AbsenceStatus status)
    {
        return status is AbsenceStatus.Completed;
        // Note: Rejected is technically terminal, but can be reopened
    }
}
