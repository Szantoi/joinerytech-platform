namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// FSM states for safety walk (munkavédelmi bejárás) workflow
/// (UI plan: utemezett → folyamatban → intezkedes → lezart, +elmaradt).
///
/// Scheduled → InProgress → ActionRequired → Closed
///     ↓             ↘ (no findings requiring action) ↗
///  Cancelled
/// </summary>
public enum SafetyWalkStatus
{
    /// <summary>Walk scheduled for a future date (utemezett)</summary>
    Scheduled = 1,

    /// <summary>Walk in progress — findings can be recorded (folyamatban)</summary>
    InProgress = 2,

    /// <summary>Walk completed with findings requiring corrective action (intezkedes)</summary>
    ActionRequired = 3,

    /// <summary>Walk closed — all corrective actions completed (lezart)</summary>
    Closed = 4,

    /// <summary>Walk cancelled before it started (elmaradt)</summary>
    Cancelled = 5
}
