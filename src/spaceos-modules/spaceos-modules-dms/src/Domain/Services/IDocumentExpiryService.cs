using SpaceOS.Modules.DMS.Domain.Aggregates;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Service for managing document expiry dates.
/// </summary>
public interface IDocumentExpiryService
{
    /// <summary>
    /// Gets documents expiring within the specified number of days.
    /// </summary>
    Task<IEnumerable<Document>> GetExpiringDocumentsAsync(
        int daysUntilExpiry,
        CancellationToken ct = default);

    /// <summary>
    /// Gets documents that have already expired.
    /// </summary>
    Task<IEnumerable<Document>> GetExpiredDocumentsAsync(
        CancellationToken ct = default);
}
