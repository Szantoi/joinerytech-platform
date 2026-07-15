namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Risk assessment lifecycle status (FSM — same convention as the other EHS aggregates):
///
///   Draft → UnderReview → Approved → Archived
///              ↓ (return-to-draft)
///            Draft
///
/// Illegal transitions throw InvalidOperationException → HTTP 409 at the API layer.
/// </summary>
public enum RiskStatus
{
    /// <summary>Being edited by the assessor — the only state where details can change (vazlat)</summary>
    Draft = 1,

    /// <summary>Submitted, awaiting review/approval (felulvizsgalat alatt)</summary>
    UnderReview = 2,

    /// <summary>Approved — live entry of the risk register (jovahagyva)</summary>
    Approved = 3,

    /// <summary>Risk mitigated or no longer relevant (archivalva)</summary>
    Archived = 4
}
