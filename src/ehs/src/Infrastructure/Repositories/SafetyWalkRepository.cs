using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.SafetyWalkAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for SafetyWalk aggregate.
/// Findings are owned entities and load together with the walk.
/// </summary>
public class SafetyWalkRepository : ISafetyWalkRepository
{
    private readonly EhsDbContext _context;

    public SafetyWalkRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get walk by ID (findings included — owned collection).</summary>
    public async Task<SafetyWalk?> GetByIdAsync(Guid safetyWalkId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.SafetyWalks
            .FirstOrDefaultAsync(w => w.SafetyWalkId == safetyWalkId && w.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>List walks with filtering (location, status, schedule window).</summary>
    public async Task<List<SafetyWalk>> ListAsync(SafetyWalkFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.SafetyWalks
            .Where(w => w.TenantId == tenantId);

        if (filter.LocationId.HasValue)
            query = query.Where(w => w.LocationId == filter.LocationId.Value);

        if (filter.Status.HasValue)
            query = query.Where(w => w.Status == filter.Status.Value);

        if (filter.ScheduledAfter.HasValue)
            query = query.Where(w => w.ScheduledDate >= filter.ScheduledAfter.Value);

        if (filter.ScheduledBefore.HasValue)
            query = query.Where(w => w.ScheduledDate <= filter.ScheduledBefore.Value);

        return await query
            .OrderByDescending(w => w.ScheduledDate)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(SafetyWalk walk, CancellationToken ct = default)
    {
        await _context.SafetyWalks.AddAsync(walk, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(SafetyWalk walk, CancellationToken ct = default)
    {
        _context.SafetyWalks.Update(walk);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
