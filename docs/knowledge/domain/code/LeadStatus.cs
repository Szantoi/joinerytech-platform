namespace JoineryTech.CRM.Domain.Enums;

/// <summary>
/// Lead status enum - FSM states for lead lifecycle
/// </summary>
public enum LeadStatus
{
    /// <summary>
    /// Initial state - newly created lead
    /// </summary>
    New = 0,

    /// <summary>
    /// Sales rep made initial contact (call, email, meeting)
    /// </summary>
    Contacted = 1,

    /// <summary>
    /// Lead qualifies for further nurturing (meets criteria)
    /// </summary>
    Qualified = 2,

    /// <summary>
    /// Lead disqualified (not a fit, out of budget, wrong timing, etc.)
    /// Terminal state - no further transitions
    /// </summary>
    Disqualified = 3,

    /// <summary>
    /// Lead converted to Opportunity
    /// Terminal state - lead lifecycle ends, opportunity begins
    /// </summary>
    Opportunity = 4
}

/// <summary>
/// FSM Transition Validator for Lead
/// </summary>
public static class LeadStatusTransitions
{
    private static readonly Dictionary<LeadStatus, HashSet<LeadStatus>> _validTransitions = new()
    {
        { LeadStatus.New, new() { LeadStatus.Contacted, LeadStatus.Disqualified } },
        { LeadStatus.Contacted, new() { LeadStatus.Qualified, LeadStatus.Disqualified } },
        { LeadStatus.Qualified, new() { LeadStatus.Opportunity, LeadStatus.Disqualified } },
        { LeadStatus.Disqualified, new() }, // Terminal state
        { LeadStatus.Opportunity, new() }   // Terminal state
    };

    public static bool IsValidTransition(LeadStatus from, LeadStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    public static HashSet<LeadStatus> GetAllowedTransitions(LeadStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<LeadStatus>();
    }
}
