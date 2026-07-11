namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Training certificate validity status (calculated based on expiry date)
/// </summary>
public enum TrainingStatus
{
    /// <summary>>30 days until expiry or no expiration</summary>
    Valid = 1,

    /// <summary>≤30 days until expiry (warning threshold)</summary>
    Expiring = 2,

    /// <summary>Past expiration date</summary>
    Expired = 3
}
