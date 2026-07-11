namespace JoineryTech.Maintenance.Domain.Repositories;

using JoineryTech.Maintenance.Domain.Aggregates;
using JoineryTech.Maintenance.Domain.ValueObjects;
using JoineryTech.Maintenance.Domain.Enums;
using JoineryTech.SharedKernel;

/// <summary>
/// Repository contract for WorkOrder aggregate
/// </summary>
public interface IWorkOrderRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get work order by ID (with RLS enforcement)
    /// </summary>
    Task<WorkOrder?> GetByIdAsync(WorkOrderId id, CancellationToken ct = default);

    /// <summary>
    /// Get all work orders for an asset (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByAssetAsync(AssetId assetId, CancellationToken ct = default);

    /// <summary>
    /// Get work orders by status (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByStatusAsync(WorkOrderStatus status, CancellationToken ct = default);

    /// <summary>
    /// Get work orders by type (Corrective, Preventive, Cleaning) (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByTypeAsync(WorkOrderType type, CancellationToken ct = default);

    /// <summary>
    /// Get work orders overlapping a date range (with RLS enforcement)
    /// Used for downtime blocking and technician scheduling
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default);

    /// <summary>
    /// Get work orders for a maintenance plan (with RLS enforcement)
    /// Used for tracking preventive maintenance execution history
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByMaintenancePlanAsync(MaintenancePlanId planId, CancellationToken ct = default);

    /// <summary>
    /// Get active work orders requiring downtime (InProgress + RequiresDowntime=true) (with RLS enforcement)
    /// Used by Production module to check machine availability
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetActiveDowntimeWorkOrdersAsync(CancellationToken ct = default);

    /// <summary>
    /// Get work orders assigned to a technician (with RLS enforcement)
    /// Used for technician workload display
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByTechnicianAsync(EmployeeId technicianId, CancellationToken ct = default);

    /// <summary>
    /// Get work orders linked to a project (cost tracking) (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<WorkOrder>> GetByProjectAsync(ProjectId projectId, CancellationToken ct = default);

    /// <summary>
    /// Get paged work orders with optional filters (with RLS enforcement)
    /// </summary>
    Task<PagedResult<WorkOrder>> GetPagedAsync(
        int page,
        int pageSize,
        WorkOrderStatus? statusFilter = null,
        WorkOrderType? typeFilter = null,
        WorkOrderPriority? priorityFilter = null,
        AssetId? assetFilter = null,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new work order (domain events not persisted here - use event bus)
    /// </summary>
    Task AddAsync(WorkOrder workOrder, CancellationToken ct = default);

    /// <summary>
    /// Update existing work order (domain events not persisted here - use event bus)
    /// </summary>
    Task UpdateAsync(WorkOrder workOrder, CancellationToken ct = default);

    // ============ AGGREGATE LOADING ============

    /// <summary>
    /// Get work order by ID with asset details
    /// Use when displaying work order with asset information
    /// </summary>
    Task<WorkOrder?> GetByIdWithAssetAsync(WorkOrderId id, CancellationToken ct = default);

    /// <summary>
    /// Get work order by ID with parts (WorkOrderPart child entities)
    /// Use when displaying parts list for work order
    /// </summary>
    Task<WorkOrder?> GetByIdWithPartsAsync(WorkOrderId id, CancellationToken ct = default);

    /// <summary>
    /// Get work order by ID with full details (asset, parts, technician)
    /// Use when full aggregate is needed (e.g., cost estimation, completion summary)
    /// </summary>
    Task<WorkOrder?> GetByIdWithFullDetailsAsync(WorkOrderId id, CancellationToken ct = default);
}
