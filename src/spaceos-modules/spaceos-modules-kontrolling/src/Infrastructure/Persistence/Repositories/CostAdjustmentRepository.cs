namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Entities;
using SpaceOS.Modules.Kontrolling.Domain.Enums;

/// <summary>
/// Repository for CostAdjustment aggregate.
/// </summary>
public sealed class CostAdjustmentRepository : ICostAdjustmentRepository
{
    private readonly KontrollingDbContext _context;

    public CostAdjustmentRepository(KontrollingDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all active adjustments for a project.
    /// </summary>
    public async Task<IEnumerable<CostAdjustment>> GetByProjectAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default)
    {
        return await _context.CostAdjustments
            .IgnoreQueryFilters() // Bypass RLS
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId &&
                        c.ProjectId == projectId &&
                        !c.IsDeleted) // Manual soft delete filter
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Get all active portfolio-wide adjustments for a tenant.
    /// Portfolio-wide = Scope is PortfolioWide (applies to all projects).
    /// </summary>
    public async Task<IEnumerable<CostAdjustment>> GetPortfolioAdjustmentsAsync(
        Guid tenantId,
        CancellationToken ct = default)
    {
        return await _context.CostAdjustments
            .IgnoreQueryFilters() // Bypass RLS
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId &&
                        c.Scope == AdjustmentScope.Portfolio &&
                        !c.IsDeleted) // Manual soft delete filter
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Add a new adjustment.
    /// </summary>
    public async Task AddAsync(
        CostAdjustment adjustment,
        CancellationToken ct = default)
    {
        await _context.CostAdjustments.AddAsync(adjustment, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    /// <summary>
    /// Get adjustment by ID.
    /// </summary>
    public async Task<CostAdjustment?> GetByIdAsync(
        Guid adjustmentId,
        Guid tenantId,
        CancellationToken ct = default)
    {
        return await _context.CostAdjustments
            .IgnoreQueryFilters() // Bypass RLS
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.TenantId == tenantId &&
                     c.AdjustmentId == adjustmentId &&
                     !c.IsDeleted, // Manual soft delete filter
                ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Save changes (for soft delete).
    /// </summary>
    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
