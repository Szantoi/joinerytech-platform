using Microsoft.EntityFrameworkCore;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Repositories;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence.Repositories;

/// <summary>
/// Repository for Asset aggregate.
/// Implements hybrid pattern: 2-param for point lookups (RLS-protected), 3-param for range queries.
/// </summary>
public class AssetRepository : IAssetRepository
{
    private readonly MaintenanceDbContext _context;

    public AssetRepository(MaintenanceDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get asset by ID (2-param, RLS isolation via DB level).
    /// </summary>
    public async Task<Asset?> GetByIdAsync(AssetId id, CancellationToken ct = default)
    {
        return await _context.Assets
            .FirstOrDefaultAsync(a => a.Id == id, ct);
    }

    /// <summary>
    /// Get asset by code and tenant (3-param, explicit tenant scoping).
    /// </summary>
    public async Task<Asset?> GetByCodeAsync(TenantId tenantId, string code, CancellationToken ct = default)
    {
        return await _context.Assets
            .FirstOrDefaultAsync(a => a.TenantId == tenantId.Value && a.Code == code, ct);
    }

    /// <summary>
    /// Get active (non-retired) assets by kind and tenant (3-param).
    /// </summary>
    public async Task<IEnumerable<Asset>> GetActiveByKindAsync(TenantId tenantId, AssetKind kind, CancellationToken ct = default)
    {
        return await _context.Assets
            .Where(a => a.TenantId == tenantId.Value && a.Kind == kind && !a.Retired)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Get active (non-retired) assets for a specific facility (3-param).
    /// </summary>
    public async Task<IEnumerable<Asset>> GetActiveByFacilityAsync(TenantId tenantId, FacilityId facilityId, CancellationToken ct = default)
    {
        return await _context.Assets
            .Where(a => a.TenantId == tenantId.Value && a.FacilityId == facilityId.Value && !a.Retired)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Get assets linked to a specific Production machine (3-param).
    /// </summary>
    public async Task<IEnumerable<Asset>> GetByMachineIdAsync(TenantId tenantId, string machineId, CancellationToken ct = default)
    {
        return await _context.Assets
            .Where(a => a.TenantId == tenantId.Value && a.MachineId == machineId && !string.IsNullOrEmpty(a.MachineId))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Add a new asset.
    /// </summary>
    public async Task AddAsync(Asset asset, CancellationToken ct = default)
    {
        await _context.Assets.AddAsync(asset, ct);
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Update an existing asset.
    /// </summary>
    public async Task UpdateAsync(Asset asset, CancellationToken ct = default)
    {
        _context.Assets.Update(asset);
        await _context.SaveChangesAsync(ct);
    }
}
