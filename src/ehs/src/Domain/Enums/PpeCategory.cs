namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Personal Protective Equipment (PPE / EVE) category.
/// Categories follow the common EN/ISO PPE grouping.
/// </summary>
public enum PpeCategory
{
    /// <summary>Head protection (helmets, bump caps)</summary>
    Head = 1,

    /// <summary>Eye and face protection (goggles, visors)</summary>
    Eye = 2,

    /// <summary>Hearing protection (earplugs, earmuffs)</summary>
    Hearing = 3,

    /// <summary>Respiratory protection (masks, respirators)</summary>
    Respiratory = 4,

    /// <summary>Hand protection (gloves, e.g. EN 388)</summary>
    Hand = 5,

    /// <summary>Foot protection (safety boots)</summary>
    Foot = 6,

    /// <summary>Body protection (workwear, aprons, hi-vis)</summary>
    Body = 7,

    /// <summary>Fall protection (harnesses, lanyards)</summary>
    Fall = 8
}
