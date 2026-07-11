namespace SpaceOS.Modules.CRM.Domain.Enums;

/// <summary>
/// FSM states for Opportunity aggregate
/// ADR-063: Added Converting (transient state for quote conversion)
/// </summary>
public enum OpportunityStatus
{
    Draft = 1,
    Proposal = 2,
    Negotiation = 3,
    Converting = 7, // Transient state during CRM→Sales integration (ADR-063)
    Won = 4,
    Lost = 5,
    Abandoned = 6
}
