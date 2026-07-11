using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.FSM;

/// <summary>
/// Ticket FSM status transitions validator
/// </summary>
public static class TicketStatusTransitions
{
    private static readonly Dictionary<TicketStatus, HashSet<TicketStatus>> _validTransitions = new()
    {
        { TicketStatus.Reported, new() { TicketStatus.Assigned } },
        { TicketStatus.Assigned, new() { TicketStatus.InProgress } },
        { TicketStatus.InProgress, new() { TicketStatus.Resolved, TicketStatus.Rejected } },
        { TicketStatus.Rejected, new() { TicketStatus.Reported } },
        { TicketStatus.Resolved, new() } // Terminal state
    };

    public static bool IsValidTransition(TicketStatus from, TicketStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    public static HashSet<TicketStatus> GetAllowedTransitions(TicketStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<TicketStatus>();
    }

    public static bool IsTerminalState(TicketStatus status)
    {
        return status == TicketStatus.Resolved;
    }
}
