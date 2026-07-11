using SpaceOS.Modules.QA.Domain.Enums;

namespace SpaceOS.Modules.QA.Domain.FSM;

/// <summary>
/// Inspection FSM status transitions validator
/// </summary>
public static class InspectionStatusTransitions
{
    private static readonly Dictionary<InspectionStatus, HashSet<InspectionStatus>> _validTransitions = new()
    {
        { InspectionStatus.Planned, new() { InspectionStatus.InProgress } },
        { InspectionStatus.InProgress, new() { InspectionStatus.Completed } },
        { InspectionStatus.Completed, new() } // Terminal state
    };

    public static bool IsValidTransition(InspectionStatus from, InspectionStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    public static HashSet<InspectionStatus> GetAllowedTransitions(InspectionStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<InspectionStatus>();
    }
}
