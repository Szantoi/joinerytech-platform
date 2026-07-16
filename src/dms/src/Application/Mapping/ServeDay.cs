namespace SpaceOS.Modules.DMS.Application.Mapping;

/// <summary>
/// Serve-time "today" source for the computed expiry projection. UTC date —
/// server-side consistency (EHS precedent); the portal renders day-level
/// values with local-time parseDay, so the day boundary difference is at most
/// the UTC offset (documented in DMS-BE-HOST.md).
/// </summary>
public static class ServeDay
{
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);
}
