namespace JoineryTech.Maintenance.Domain.Enums;

/// <summary>
/// WorkOrder lifecycle status (FSM enforcement)
/// </summary>
public enum WorkOrderStatus
{
    /// <summary>
    /// Work order created, awaiting scheduling
    /// </summary>
    Reported = 0,

    /// <summary>
    /// Work order scheduled (date, technician assigned)
    /// </summary>
    Scheduled = 1,

    /// <summary>
    /// Work in progress (technician working on asset)
    /// </summary>
    InProgress = 2,

    /// <summary>
    /// Work completed (asset available, hours logged)
    /// </summary>
    Completed = 3,

    /// <summary>
    /// Work order postponed (reschedule needed)
    /// </summary>
    Postponed = 4,

    /// <summary>
    /// Work order rejected (not feasible, duplicate, etc.)
    /// </summary>
    Rejected = 5
}

/// <summary>
/// FSM transition validator for WorkOrder status
/// </summary>
public static class WorkOrderStatusTransitions
{
    private static readonly Dictionary<WorkOrderStatus, HashSet<WorkOrderStatus>> _validTransitions = new()
    {
        { WorkOrderStatus.Reported, new() { WorkOrderStatus.Scheduled, WorkOrderStatus.Rejected } },
        { WorkOrderStatus.Scheduled, new() { WorkOrderStatus.InProgress, WorkOrderStatus.Postponed, WorkOrderStatus.Rejected } },
        { WorkOrderStatus.InProgress, new() { WorkOrderStatus.Completed, WorkOrderStatus.Postponed } },
        { WorkOrderStatus.Postponed, new() { WorkOrderStatus.Reported } },
        { WorkOrderStatus.Rejected, new() { WorkOrderStatus.Reported } },
        { WorkOrderStatus.Completed, new() } // Terminal state
    };

    /// <summary>
    /// Validate if transition from current status to new status is allowed
    /// </summary>
    public static bool IsValidTransition(WorkOrderStatus current, WorkOrderStatus next)
    {
        if (!_validTransitions.TryGetValue(current, out var allowedTransitions))
            return false;

        return allowedTransitions.Contains(next);
    }

    /// <summary>
    /// Get all valid next states from current state
    /// </summary>
    public static IEnumerable<WorkOrderStatus> GetValidNextStates(WorkOrderStatus current)
    {
        return _validTransitions.TryGetValue(current, out var states) ? states : Enumerable.Empty<WorkOrderStatus>();
    }

    /// <summary>
    /// Check if status blocks asset availability (requires downtime)
    /// </summary>
    public static bool IsBlockingStatus(WorkOrderStatus status)
    {
        // Only InProgress blocks asset if RequiresDowntime=true
        return status == WorkOrderStatus.InProgress;
    }

    /// <summary>
    /// Check if status is terminal (no further transitions)
    /// </summary>
    public static bool IsTerminalStatus(WorkOrderStatus status)
    {
        return status == WorkOrderStatus.Completed;
    }
}
