namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Domain.Entities;

/// <summary>
/// Repository for CostAdjustment entity
/// </summary>
public interface ICostAdjustmentRepository
{
    /// <summary>
    /// Get all active adjustments for a project
    /// </summary>
    Task<IEnumerable<CostAdjustment>> GetByProjectAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Get all active portfolio-wide adjustments for a tenant
    /// </summary>
    Task<IEnumerable<CostAdjustment>> GetPortfolioAdjustmentsAsync(
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Add a new adjustment
    /// </summary>
    Task AddAsync(CostAdjustment adjustment, CancellationToken ct = default);

    /// <summary>
    /// Get adjustment by ID
    /// </summary>
    Task<CostAdjustment?> GetByIdAsync(Guid adjustmentId, Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Get every live adjustment of the tenant, both scopes, newest first.
    /// </summary>
    /// <remarks>
    /// The portfolio and variance read models need the adjustments of all
    /// projects at once; fetching them per project would be an N+1 query.
    /// </remarks>
    Task<IReadOnlyList<CostAdjustment>> GetAllAsync(Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Get an adjustment for mutation: TRACKED, and including soft-deleted rows.
    /// </summary>
    /// <remarks>
    /// Distinct from <see cref="GetByIdAsync"/> on both counts, and both matter:
    /// the entity must be tracked for <see cref="SaveChangesAsync"/> to persist
    /// a soft delete, and an already-deleted row must still be found so the
    /// caller can answer "already deleted" (409) instead of "unknown" (404).
    /// </remarks>
    Task<CostAdjustment?> GetForUpdateAsync(Guid adjustmentId, Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Save changes (for soft delete)
    /// </summary>
    Task SaveChangesAsync(CancellationToken ct = default);
}
