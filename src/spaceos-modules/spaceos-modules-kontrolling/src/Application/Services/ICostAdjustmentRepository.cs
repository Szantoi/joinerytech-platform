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
    /// Save changes (for soft delete)
    /// </summary>
    Task SaveChangesAsync(CancellationToken ct = default);
}
