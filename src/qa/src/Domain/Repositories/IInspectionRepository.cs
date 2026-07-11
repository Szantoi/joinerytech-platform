using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Repositories;

/// <summary>
/// Repository interface for Inspection aggregate.
/// Persistence contract for inspection CRUD and query operations.
/// </summary>
public interface IInspectionRepository
{
    /// <summary>
    /// Gets an inspection by ID with tenant filtering.
    /// </summary>
    Task<Inspection?> GetByIdAsync(
        InspectionId id,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all inspections for a specific order.
    /// CRITICAL: Used by InspectionBlockingService to check production blocking.
    /// </summary>
    Task<IEnumerable<Inspection>> GetByOrderIdAsync(
        Guid orderId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets inspections by checkpoint for analysis.
    /// </summary>
    Task<IEnumerable<Inspection>> GetByCheckpointIdAsync(
        QACheckpointId checkpointId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets inspections by status (for workflow tracking).
    /// </summary>
    Task<IEnumerable<Inspection>> GetByStatusAsync(
        InspectionStatus status,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Gets failed inspections in date range (for Pareto analysis).
    /// </summary>
    Task<IEnumerable<Inspection>> GetFailedInspectionsAsync(
        Guid tenantId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken ct = default);

    /// <summary>
    /// Gets blocking inspections for an order (Result = Fail, CriticalLevel = Critical).
    /// CRITICAL: Integration point with Production module.
    /// </summary>
    Task<IEnumerable<Inspection>> GetBlockingInspectionsAsync(
        Guid orderId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Adds a new inspection.
    /// </summary>
    Task AddAsync(Inspection inspection, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing inspection.
    /// </summary>
    Task UpdateAsync(Inspection inspection, CancellationToken ct = default);

    /// <summary>
    /// Checks if any blocking inspections exist for an order.
    /// CRITICAL: Fast check for production blocking status.
    /// </summary>
    Task<bool> HasBlockingInspectionsAsync(
        Guid orderId,
        Guid tenantId,
        CancellationToken ct = default);
}
