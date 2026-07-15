using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for EhsLocation aggregate (hierarchical registry).
/// </summary>
public class EhsLocationRepository : IEhsLocationRepository
{
    private readonly EhsDbContext _context;

    public EhsLocationRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get location by ID with tenant filtering.</summary>
    public async Task<EhsLocation?> GetByIdAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Locations
            .FirstOrDefaultAsync(l => l.LocationId == locationId && l.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Flat list with filtering (activeOnly, kind, parent) — clients build the tree.
    /// </summary>
    public async Task<List<EhsLocation>> ListAsync(LocationFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.Locations
            .Where(l => l.TenantId == tenantId);

        if (filter.ActiveOnly == true)
            query = query.Where(l => l.IsActive);

        if (filter.Kind.HasValue)
            query = query.Where(l => l.Kind == filter.Kind.Value);

        if (filter.ParentLocationId.HasValue)
            query = query.Where(l => l.ParentLocationId == filter.ParentLocationId.Value);

        return await query
            .OrderBy(l => l.Code)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(EhsLocation location, CancellationToken ct = default)
    {
        await _context.Locations.AddAsync(location, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(EhsLocation location, CancellationToken ct = default)
    {
        _context.Locations.Update(location);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task<bool> ExistsAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Locations
            .AnyAsync(l => l.LocationId == locationId && l.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>Deactivation guard: any ACTIVE children below this node?</summary>
    public async Task<bool> HasActiveChildrenAsync(Guid locationId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.Locations
            .AnyAsync(l => l.ParentLocationId == locationId && l.TenantId == tenantId && l.IsActive, ct)
            .ConfigureAwait(false);
    }
}
