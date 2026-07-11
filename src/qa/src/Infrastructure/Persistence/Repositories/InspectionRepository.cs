using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.QA.Domain.Aggregates;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Repositories;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Infrastructure.Persistence.Repositories;

/// <summary>
/// Repository for Inspection aggregate.
/// Implements 3-param tenant scoping pattern per domain interface.
/// CRITICAL: Handles production blocking queries for inventory integration.
/// </summary>
public class InspectionRepository : IInspectionRepository
{
    private readonly QADbContext _context;

    public InspectionRepository(QADbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get inspection by ID with tenant filtering.
    /// </summary>
    public async Task<Inspection?> GetByIdAsync(InspectionId id, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .FirstOrDefaultAsync(i => i.Id == id && i.TenantId == tenantId, ct);
    }

    /// <summary>
    /// Gets all inspections for a specific order.
    /// CRITICAL: Used by InspectionBlockingService to check production blocking.
    /// </summary>
    public async Task<IEnumerable<Inspection>> GetByOrderIdAsync(Guid orderId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .Where(i => i.TenantId == tenantId && i.OrderId == orderId)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Gets inspections by checkpoint for analysis.
    /// </summary>
    public async Task<IEnumerable<Inspection>> GetByCheckpointIdAsync(QACheckpointId checkpointId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .Where(i => i.TenantId == tenantId && i.CheckpointId == checkpointId)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Gets inspections by status (for workflow tracking).
    /// </summary>
    public async Task<IEnumerable<Inspection>> GetByStatusAsync(InspectionStatus status, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .Where(i => i.TenantId == tenantId && i.Status == status)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Gets failed inspections in date range (for Pareto analysis).
    /// </summary>
    public async Task<IEnumerable<Inspection>> GetFailedInspectionsAsync(Guid tenantId, DateTime fromDate, DateTime toDate, CancellationToken ct = default)
    {
        return await _context.Inspections
            .Where(i => i.TenantId == tenantId &&
                        i.Result == InspectionResult.Fail &&
                        i.CompletedAt >= fromDate &&
                        i.CompletedAt <= toDate)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Gets blocking inspections for an order (Result = Fail, CriticalLevel = Critical).
    /// CRITICAL: Integration point with Production module.
    /// </summary>
    public async Task<IEnumerable<Inspection>> GetBlockingInspectionsAsync(Guid orderId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .Where(i => i.TenantId == tenantId &&
                        i.OrderId == orderId &&
                        i.Result == InspectionResult.Fail)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Add a new inspection.
    /// </summary>
    public async Task AddAsync(Inspection inspection, CancellationToken ct = default)
    {
        await _context.Inspections.AddAsync(inspection, ct);
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Update an existing inspection.
    /// </summary>
    public async Task UpdateAsync(Inspection inspection, CancellationToken ct = default)
    {
        _context.Inspections.Update(inspection);
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Checks if any blocking inspections exist for an order.
    /// CRITICAL: Fast check for production blocking status.
    /// </summary>
    public async Task<bool> HasBlockingInspectionsAsync(Guid orderId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Inspections
            .AnyAsync(i => i.TenantId == tenantId &&
                          i.OrderId == orderId &&
                          i.Result == InspectionResult.Fail, ct);
    }
}
