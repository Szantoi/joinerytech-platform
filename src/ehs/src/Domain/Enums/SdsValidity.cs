namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Safety Data Sheet (SDS) validity status.
/// CALCULATED from SdsExpiresAt (TrainingStatus pattern) — never stored.
/// </summary>
public enum SdsValidity
{
    /// <summary>&gt;30 days until SDS expiry</summary>
    Valid = 1,

    /// <summary>≤30 days until SDS expiry (warning threshold)</summary>
    Expiring = 2,

    /// <summary>SDS past its expiration date</summary>
    Expired = 3
}
