using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.HazardousMaterialAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for HazardousMaterial aggregate (SDS registry).
/// The calculated SdsValidity filter is translated to SQL-friendly date ranges
/// so filtering happens in the database.
/// </summary>
public class HazardousMaterialRepository : IHazardousMaterialRepository
{
    /// <summary>Expiring threshold in days — must match HazardousMaterial.CheckSdsValidity</summary>
    private const int ExpiringThresholdDays = 30;

    private readonly EhsDbContext _context;

    public HazardousMaterialRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get material by ID with tenant filtering.</summary>
    public async Task<HazardousMaterial?> GetByIdAsync(Guid materialId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.HazardousMaterials
            .FirstOrDefaultAsync(m => m.MaterialId == materialId && m.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// List materials with filtering (status, storage location, SDS validity).
    /// </summary>
    public async Task<List<HazardousMaterial>> ListAsync(MaterialFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.HazardousMaterials
            .Where(m => m.TenantId == tenantId);

        if (filter.Status.HasValue)
            query = query.Where(m => m.Status == filter.Status.Value);

        if (filter.LocationId.HasValue)
            query = query.Where(m => m.StorageLocationId == filter.LocationId.Value);

        // Translate the calculated validity to date ranges (see CheckSdsValidity)
        if (filter.Validity.HasValue)
        {
            var now = DateTimeOffset.UtcNow;
            var expiringLimit = now.AddDays(ExpiringThresholdDays);

            query = filter.Validity.Value switch
            {
                SdsValidity.Valid => query.Where(m => m.SdsExpiresAt > expiringLimit),
                SdsValidity.Expiring => query.Where(m => m.SdsExpiresAt > now && m.SdsExpiresAt <= expiringLimit),
                SdsValidity.Expired => query.Where(m => m.SdsExpiresAt <= now),
                _ => query
            };
        }

        return await query
            .OrderBy(m => m.SdsExpiresAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    /// <summary>Active materials whose SDS expires within the window (dashboard).</summary>
    public async Task<List<HazardousMaterial>> ListExpiringSdsAsync(int withinDays, Guid tenantId, CancellationToken ct = default)
    {
        var limit = DateTimeOffset.UtcNow.AddDays(withinDays);

        return await _context.HazardousMaterials
            .Where(m => m.TenantId == tenantId
                        && m.Status == MaterialStatus.Active
                        && m.SdsExpiresAt <= limit)
            .OrderBy(m => m.SdsExpiresAt)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(HazardousMaterial material, CancellationToken ct = default)
    {
        await _context.HazardousMaterials.AddAsync(material, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(HazardousMaterial material, CancellationToken ct = default)
    {
        _context.HazardousMaterials.Update(material);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
