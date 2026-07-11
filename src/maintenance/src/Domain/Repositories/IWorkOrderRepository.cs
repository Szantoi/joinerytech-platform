using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.Repositories;

/// <summary>
/// WorkOrder repository contract for persistence operations.
/// </summary>
public interface IWorkOrderRepository
{
    /// <summary>
    /// Gets a work order by its ID.
    /// </summary>
    Task<WorkOrder?> GetByIdAsync(WorkOrderId id, CancellationToken ct = default);

    /// <summary>
    /// Gets all active (non-completed, non-rejected) work orders for a specific asset.
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetActiveByAssetAsync(AssetId assetId, CancellationToken ct = default);

    /// <summary>
    /// Gets all work orders with a specific status for a tenant.
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByStatusAsync(TenantId tenantId, WorkOrderStatus status, CancellationToken ct = default);

    /// <summary>
    /// CRITICAL: Production integration query.
    /// Gets all in-progress work orders that require downtime (blocking machine capacity).
    /// Used by Production module to calculate available machine hours.
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetInProgressWithDowntimeAsync(TenantId tenantId, CancellationToken ct = default);

    /// <summary>
    /// Gets all preventive work orders that are due today (for scheduling).
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetDuePreventiveAsync(TenantId tenantId, DateOnly today, CancellationToken ct = default);

    /// <summary>
    /// Adds a new work order.
    /// </summary>
    Task AddAsync(WorkOrder workOrder, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing work order.
    /// </summary>
    Task UpdateAsync(WorkOrder workOrder, CancellationToken ct = default);
}
