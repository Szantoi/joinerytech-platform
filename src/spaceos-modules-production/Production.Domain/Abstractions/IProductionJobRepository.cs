using SpaceOS.Modules.Production.Domain.ProductionJobs;
using SpaceOS.Modules.Production.Domain.ProductionJobs.ValueObjects;

namespace SpaceOS.Modules.Production.Domain.Abstractions;

/// <summary>
/// ProductionJob repository abstraction (implemented in Infrastructure layer)
/// </summary>
public interface IProductionJobRepository
{
    /// <summary>
    /// Get ProductionJob by ID
    /// </summary>
    Task<ProductionJob?> GetByIdAsync(ProductionJobId id, CancellationToken ct = default);

    /// <summary>
    /// Get ProductionJob by OrderId (1-to-1 mapping)
    /// </summary>
    Task<ProductionJob?> GetByOrderIdAsync(Guid orderId, CancellationToken ct = default);

    /// <summary>
    /// Get all ProductionJobs (filtered by status, overdue, etc.)
    /// </summary>
    Task<List<ProductionJob>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Find ProductionJobs by AssetId (for cross-module asset downtime handling)
    /// </summary>
    Task<List<ProductionJob>> FindByAssetIdAsync(Guid assetId, CancellationToken ct = default);

    /// <summary>
    /// Add new ProductionJob
    /// </summary>
    Task AddAsync(ProductionJob job, CancellationToken ct = default);

    /// <summary>
    /// Update existing ProductionJob
    /// </summary>
    Task UpdateAsync(ProductionJob job, CancellationToken ct = default);

    /// <summary>
    /// Save changes (unit of work)
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
