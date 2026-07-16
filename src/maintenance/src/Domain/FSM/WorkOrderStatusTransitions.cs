using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Domain.FSM;

/// <summary>
/// WorkOrder FSM status transition table.
/// This is the single declarative source of the allowed transitions and it is
/// enforced by the <c>WorkOrder</c> aggregate itself (every transition method
/// guards via <see cref="IsValidTransition"/>), so table and aggregate cannot diverge.
/// The portal client FSM (joinerytech-portal services/maintenance/fsm.ts
/// WORK_ORDER_FSM) is a 1:1 mirror of this table:
///   Schedule:  Reported → Scheduled
///   StartWork: Scheduled → InProgress          (assignment required — extra aggregate guard)
///   Complete:  InProgress → Completed          (terminal)
///   Postpone:  Scheduled | InProgress → Postponed
///   Reject:    Reported | Scheduled → Rejected
///   Reopen:    Postponed | Rejected → Reported
/// NOTE (MAINT-BE-TRANSITIONS): the former Reported → InProgress edge ("if assigned")
/// was removed — <c>WorkOrder.StartWork()</c> only ever allowed Scheduled → InProgress,
/// and the portal contract mirrors the aggregate. Re-introducing a direct
/// Reported → InProgress shortcut is an ADR candidate (see task doc).
/// </summary>
public static class WorkOrderStatusTransitions
{
    private static readonly Dictionary<WorkOrderStatus, HashSet<WorkOrderStatus>> _validTransitions = new()
    {
        // Reported → Scheduled (schedule), Rejected (reject)
        { WorkOrderStatus.Reported, new() { WorkOrderStatus.Scheduled, WorkOrderStatus.Rejected } },

        // Scheduled → InProgress (start, assignment required), Postponed, Rejected
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
        return _validTransitions.TryGetValue(from, out var allowed) && allowed.Contains(to);
    }

    /// <summary>
    /// Returns all allowed transitions from a given status.
    /// </summary>
    public static HashSet<WorkOrderStatus> GetAllowedTransitions(WorkOrderStatus from)
    {
        return _validTransitions.TryGetValue(from, out var allowed)
            ? new HashSet<WorkOrderStatus>(allowed)
            : new HashSet<WorkOrderStatus>();
    }

    /// <summary>
    /// Checks if a status is a terminal state (no further transitions allowed).
    /// </summary>
    public static bool IsTerminalState(WorkOrderStatus status)
    {
        return status == WorkOrderStatus.Completed;
    }
}
