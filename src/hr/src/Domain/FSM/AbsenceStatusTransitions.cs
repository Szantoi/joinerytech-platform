using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Domain.FSM;

/// <summary>
/// Absence FSM transition validator.
/// Enforces valid state transitions for absence requests.
/// </summary>
public static class AbsenceStatusTransitions
{
    private static readonly Dictionary<AbsenceStatus, HashSet<AbsenceStatus>> _validTransitions = new()
    {
        { AbsenceStatus.Pending, new() { AbsenceStatus.Approved, AbsenceStatus.Rejected } },
        { AbsenceStatus.Approved, new() { AbsenceStatus.InProgress } },
        { AbsenceStatus.Rejected, new() { AbsenceStatus.Pending } }, // Reopen
        { AbsenceStatus.InProgress, new() { AbsenceStatus.Completed } },
        { AbsenceStatus.Completed, new() } // Terminal state
    };

    /// <summary>
    /// Checks if transition from one status to another is valid.
    /// </summary>
    public static bool IsValidTransition(AbsenceStatus from, AbsenceStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    /// <summary>
    /// Gets all allowed target statuses from the given status.
    /// </summary>
    public static IReadOnlyList<AbsenceStatus> GetAllowedTransitions(AbsenceStatus from)
    {
        return _validTransitions.ContainsKey(from)
            ? _validTransitions[from].ToList()
            : new List<AbsenceStatus>();
    }

    /// <summary>
    /// Checks if the given status is a terminal state (no further transitions).
    /// </summary>
    public static bool IsTerminalState(AbsenceStatus status)
    {
        return !_validTransitions.ContainsKey(status) || _validTransitions[status].Count == 0;
    }
}
