namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Computed expiry state of a document relative to "today" and the configured
/// warning window (Dms:Expiry:WarnDays — portal EXPIRY_WARN_DAYS mirror).
/// CamelCase wire format matches the portal contract exactly
/// ("lejart", "lejaro"); documents outside the window serialize as null.
/// </summary>
public enum ExpiryState
{
    /// <summary>ValidUntil has passed (portal: 'lejart').</summary>
    Lejart = 0,

    /// <summary>ValidUntil falls within the warning window (portal: 'lejaro').</summary>
    Lejaro = 1
}
