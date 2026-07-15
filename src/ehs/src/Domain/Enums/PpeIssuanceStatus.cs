namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// FSM states for PPE issuance workflow (UI plan: kiadva → atvett → visszavett | cserelve).
/// The "lejart" (expired) state is CALCULATED from ExpiresAt — never stored.
///
/// Issued → Acknowledged → Returned
///                       ↘ Replaced
/// </summary>
public enum PpeIssuanceStatus
{
    /// <summary>PPE handed out to the employee (kiadva)</summary>
    Issued = 1,

    /// <summary>Employee acknowledged receipt (atvett)</summary>
    Acknowledged = 2,

    /// <summary>PPE returned to stock — terminal (visszavett)</summary>
    Returned = 3,

    /// <summary>PPE replaced by a new issuance — terminal (cserelve)</summary>
    Replaced = 4
}
