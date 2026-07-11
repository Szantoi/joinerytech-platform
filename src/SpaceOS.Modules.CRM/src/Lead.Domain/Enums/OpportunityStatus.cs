namespace SpaceOS.Modules.CRM.Domain.Enums;

/// <summary>
/// FSM states for Opportunity aggregate (ADR-054, §2.2)
/// </summary>
public enum OpportunityStatus
{
    /// <summary>New opportunity, initial stage. Probability: 10%</summary>
    Open = 0,

    /// <summary>Needs assessment underway. Probability: 25%</summary>
    NeedsAssessment = 1,

    /// <summary>Solution assembly in progress. Probability: 50%</summary>
    SolutionAssembly = 2,

    /// <summary>Proposal sent to customer. Probability: 75%</summary>
    Proposal = 3,

    /// <summary>Negotiation underway. Probability: 90%</summary>
    Negotiation = 4,

    /// <summary>Won (terminal state). Probability: 100%</summary>
    Won = 5,

    /// <summary>Lost (terminal state). Probability: 0%</summary>
    Lost = 6,

    /// <summary>Abandoned (terminal state). Probability: 0%</summary>
    Abandoned = 7
}
