namespace SpaceOS.Modules.CRM.Domain.Enums;

/// <summary>
/// FSM states for Lead aggregate (ADR-054, §2.1)
/// </summary>
public enum LeadStatus
{
    /// <summary>Initial state, not yet contacted. Probability: 0%</summary>
    New = 0,

    /// <summary>First contact made, pending qualification. Probability: 10%</summary>
    Contacted = 1,

    /// <summary>Meets criteria, ready for opportunity conversion. Probability: 25%</summary>
    Qualified = 2,

    /// <summary>Does not meet criteria (terminal state). Probability: 0%</summary>
    Disqualified = 3,

    /// <summary>Converted to Opportunity (terminal state).</summary>
    Opportunity = 4
}

/// <summary>
/// Lead source (where did this lead come from?)
/// </summary>
public enum LeadSource
{
    Unknown = 0,
    Website = 1,
    Phone = 2,
    Email = 3,
    TradeShow = 4,
    Referral = 5,
    Partner = 6,
    Direct = 7,
    Marketing = 8,
    SocialMedia = 9
}
