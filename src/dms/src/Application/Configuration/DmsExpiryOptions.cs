namespace SpaceOS.Modules.DMS.Application.Configuration;

/// <summary>
/// Expiry-watch configuration — CONFIG-DRIVEN (QUALITY.md 3.: thresholds are
/// never literals). Section: "Dms:Expiry", key: WarnDays; a missing key falls
/// back to the default that mirrors the portal EXPIRY_WARN_DAYS (30).
/// </summary>
/// <param name="WarnDays">
/// Warning window in days: a document whose ValidUntil falls within this many
/// days is "lejaro" (expiring soon); past ValidUntil is "lejart".
/// </param>
public record DmsExpiryOptions(int WarnDays)
{
    /// <summary>Portal EXPIRY_WARN_DAYS mirror.</summary>
    public static DmsExpiryOptions Default { get; } = new(30);

    /// <summary>Configuration section path for the host.</summary>
    public const string SectionName = "Dms:Expiry";
}
