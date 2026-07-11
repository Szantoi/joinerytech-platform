namespace JoineryTech.CRM.Domain.Enums;

/// <summary>
/// Opportunity status enum - FSM states for sales pipeline
/// </summary>
public enum OpportunityStatus
{
    /// <summary>
    /// Initial state - opportunity opened, minimal discovery
    /// </summary>
    Open = 0,

    /// <summary>
    /// Needs assessment - gathering requirements, pain points
    /// </summary>
    NeedsAssessment = 1,

    /// <summary>
    /// Solution assembly - designing solution, calculating pricing
    /// </summary>
    SolutionAssembly = 2,

    /// <summary>
    /// Proposal sent - quote delivered to customer
    /// Requires QuoteRef to be set
    /// </summary>
    Proposal = 3,

    /// <summary>
    /// Negotiation - customer reviewing, negotiations ongoing
    /// </summary>
    Negotiation = 4,

    /// <summary>
    /// Won - customer accepted, order created
    /// Terminal state - requires OrderRef to be set
    /// </summary>
    Won = 5,

    /// <summary>
    /// Lost - customer declined or chose competitor
    /// Terminal state - requires reason
    /// </summary>
    Lost = 6,

    /// <summary>
    /// Abandoned - no response from customer or stale
    /// Terminal state - requires reason
    /// </summary>
    Abandoned = 7
}

/// <summary>
/// FSM Transition Validator for Opportunity
/// </summary>
public static class OpportunityStatusTransitions
{
    private static readonly Dictionary<OpportunityStatus, HashSet<OpportunityStatus>> _validTransitions = new()
    {
        { OpportunityStatus.Open, new() { OpportunityStatus.NeedsAssessment, OpportunityStatus.Lost, OpportunityStatus.Abandoned } },
        { OpportunityStatus.NeedsAssessment, new() { OpportunityStatus.SolutionAssembly, OpportunityStatus.Lost, OpportunityStatus.Abandoned } },
        { OpportunityStatus.SolutionAssembly, new() { OpportunityStatus.Proposal, OpportunityStatus.Lost, OpportunityStatus.Abandoned } },
        { OpportunityStatus.Proposal, new() { OpportunityStatus.Negotiation, OpportunityStatus.Lost, OpportunityStatus.Abandoned } },
        { OpportunityStatus.Negotiation, new() { OpportunityStatus.Won, OpportunityStatus.Lost, OpportunityStatus.Abandoned } },
        { OpportunityStatus.Won, new() },       // Terminal state
        { OpportunityStatus.Lost, new() },      // Terminal state
        { OpportunityStatus.Abandoned, new() }  // Terminal state
    };

    public static bool IsValidTransition(OpportunityStatus from, OpportunityStatus to)
    {
        return _validTransitions.ContainsKey(from) && _validTransitions[from].Contains(to);
    }

    public static HashSet<OpportunityStatus> GetAllowedTransitions(OpportunityStatus from)
    {
        return _validTransitions.ContainsKey(from) ? _validTransitions[from] : new HashSet<OpportunityStatus>();
    }

    public static bool IsTerminalState(OpportunityStatus status)
    {
        return status is OpportunityStatus.Won or OpportunityStatus.Lost or OpportunityStatus.Abandoned;
    }
}
