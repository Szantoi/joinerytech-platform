using Microsoft.EntityFrameworkCore;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Repositories;

/// <summary>
/// Repository for WorkOrder aggregate.
/// Implements hybrid pattern: 2-param for point lookups (RLS-protected), 3-param for range queries.
/// </summary>
public class WorkOrderRepository : IWorkOrderRepository
{
    private readonly MaintenanceDbContext _context;

    public WorkOrderRepository(MaintenanceDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get work order by ID (2-param, RLS isolation via DB level).
    /// </summary>
    public async Task<WorkOrder?> GetByIdAsync(WorkOrderId id, CancellationToken ct = default)
    {
        return await _context.WorkOrders
            .FirstOrDefaultAsync(w => w.Id == id, ct);
    }

    /// <summary>
    /// Get all active (non-completed, non-rejected) work orders for a specific asset (2-param).
    /// </summary>
    public async Task<IEnumerable<WorkOrder>> GetActiveByAssetAsync(AssetId assetId, CancellationToken ct = default)
    {
        return await _context.WorkOrders
            .Where(w => w.AssetId == assetId &&
                        w.Status != WorkOrderStatus.Completed &&
                        w.Status != WorkOrderStatus.Rejected)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Get all work orders with a specific status for a tenant (3-param).
    /// </summary>
    public async Task<IEnumerable<WorkOrder>> GetByStatusAsync(TenantId tenantId, WorkOrderStatus status, CancellationToken ct = default)
    {
        return await _context.WorkOrders
            .Where(w => w.TenantId == tenantId.Value && w.Status == status)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Get all in-progress work orders that require downtime (blocking machine capacity) (3-param).
    /// CRITICAL: Production integration query used to calculate available machine hours.
    /// </summary>
    public async Task<IEnumerable<WorkOrder>> GetInProgressWithDowntimeAsync(TenantId tenantId, CancellationToken ct = default)
    {
        return await _context.WorkOrders
            .Where(w => w.TenantId == tenantId.Value &&
                        w.Status == WorkOrderStatus.InProgress &&
                        w.RequiresDowntime)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Get all preventive work orders that are due today (for scheduling) (3-param).
    /// </summary>
    public async Task<IEnumerable<WorkOrder>> GetDuePreventiveAsync(TenantId tenantId, DateOnly today, CancellationToken ct = default)
    {
        var startOfDay = today.ToDateTime(TimeOnly.MinValue);
        var endOfDay = today.AddDays(1).ToDateTime(TimeOnly.MinValue);

        return await _context.WorkOrders
            .Where(w => w.TenantId == tenantId.Value &&
                        w.Type == WorkOrderType.Preventive &&
                        (w.Status == WorkOrderStatus.Reported || w.Status == WorkOrderStatus.Scheduled) &&
                        w.ReportedAt >= startOfDay &&
                        w.ReportedAt < endOfDay)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Add a new work order.
    /// </summary>
    public async Task AddAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        await _context.WorkOrders.AddAsync(workOrder, ct);
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Update an existing work order.
    /// </summary>
    public async Task UpdateAsync(WorkOrder workOrder, CancellationToken ct = default)
    {
        _context.WorkOrders.Update(workOrder);
        await _context.SaveChangesAsync(ct);
    }
}
