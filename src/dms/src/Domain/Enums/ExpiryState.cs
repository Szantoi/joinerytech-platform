namespace SpaceOS.Modules.DMS.Domain.Enums;

/// <summary>
/// Computed expiry state of a document relative to "today" and the configured
/// warning window (Dms:Expiry:WarnDays — portal EXPIRY_WARN_DAYS mirror).
/// Member names are English domain vocabulary (ADR-059); the portal's canonical
/// Hungarian wire keys ("lejart", "lejaro") are applied at the serialization
/// seam (Api/WireEnums.cs — DmsWire.Expiry). Documents outside the window
/// serialize as null.
/// </summary>
public enum ExpiryState
{
    /// <summary>ValidUntil has passed (wire: "lejart").</summary>
    Expired = 0,

    /// <summary>ValidUntil falls within the warning window (wire: "lejaro").</summary>
    Expiring = 1
}
