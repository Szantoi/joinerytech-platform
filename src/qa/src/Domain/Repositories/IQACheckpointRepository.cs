using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Repositories;

/// <summary>
/// Repository interface for QACheckpoint aggregate.
/// Persistence contract for checkpoint CRUD operations.
/// </summary>
public interface IQACheckpointRepository
{
    /// <summary>
    /// Gets a checkpoint by ID with tenant filtering.
    /// </summary>
    Task<QACheckpoint?> GetByIdAsync(
        QACheckpointId id,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all active checkpoints for a tenant.
    /// </summary>
    Task<IEnumerable<QACheckpoint>> GetActiveCheckpointsAsync(
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets checkpoints by type for a tenant.
    /// </summary>
    Task<IEnumerable<QACheckpoint>> GetByTypeAsync(
        Guid tenantId,
        string checkpointType,
        CancellationToken ct = default);

    /// <summary>
    /// Adds a new checkpoint.
    /// </summary>
    Task AddAsync(QACheckpoint checkpoint, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing checkpoint.
    /// </summary>
    Task UpdateAsync(QACheckpoint checkpoint, CancellationToken ct = default);

    /// <summary>
    /// Soft deletes a checkpoint (sets IsActive = false).
    /// </summary>
    Task DeleteAsync(QACheckpointId id, Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Checks if a checkpoint with given name exists for tenant.
    /// </summary>
    Task<bool> ExistsAsync(
        string name,
        Guid tenantId,
        CancellationToken ct = default);
}
