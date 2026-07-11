namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// FSM states for Incident workflow
/// Reported → Investigated → CorrectiveActionPlanned → Closed
///                                                      ↓
///                                                   Reopened
/// </summary>
public enum IncidentStatus
{
    /// <summary>Initial state - incident reported but not yet investigated</summary>
    Reported = 1,

    /// <summary>Investigation started</summary>
    Investigated = 2,

    /// <summary>Corrective actions planned</summary>
    CorrectiveActionPlanned = 3,

    /// <summary>Incident closed after corrective actions completed</summary>
    Closed = 4,

    /// <summary>Closed incident reopened for additional review</summary>
    Reopened = 5
}
