using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Domain.FSM;

/// <summary>
/// WorkOrder FSM status transitions validator.
/// Defines allowed transitions between WorkOrder statuses.
/// </summary>
public static class WorkOrderStatusTransitions
{
    private static readonly Dictionary<WorkOrderStatus, HashSet<WorkOrderStatus>> _validTransitions = new()
    {
        // Reported → Scheduled, InProgress (if assigned), Rejected
        { WorkOrderStatus.Reported, new() { WorkOrderStatus.Scheduled, WorkOrderStatus.InProgress, WorkOrderStatus.Rejected } },

        // Scheduled → InProgress (if assigned), Postponed, Rejected
        { WorkOrderStatus.Scheduled, new() { WorkOrderStatus.InProgress, WorkOrderStatus.Postponed, WorkOrderStatus.Rejected } },

        // InProgress → Completed, Postponed
        { WorkOrderStatus.InProgress, new() { WorkOrderStatus.Completed, WorkOrderStatus.Postponed } },

        // Postponed → Reported (reopen)
        { WorkOrderStatus.Postponed, new() { WorkOrderStatus.Reported } },

        // Rejected → Reported (reopen)
        { WorkOrderStatus.Rejected, new() { WorkOrderStatus.Reported } },

        // Completed → {} (terminal state, no further transitions)
        { WorkOrderStatus.Completed, new() }
    };

    /// <summary>
    /// Checks if a transition from one status to another is valid.
    /// </summary>
    public static bool IsValidTransition(WorkOrderStatus from, WorkOrderStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    /// <summary>
    /// Returns all allowed transitions from a given status.
    /// </summary>
    public static HashSet<WorkOrderStatus> GetAllowedTransitions(WorkOrderStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<WorkOrderStatus>();
    }

    /// <summary>
    /// Checks if a status is a terminal state (no further transitions allowed).
    /// </summary>
    public static bool IsTerminalState(WorkOrderStatus status)
    {
        return status == WorkOrderStatus.Completed;
    }
}
