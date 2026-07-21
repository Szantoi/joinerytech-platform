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

    /// <summary>
    /// Finding ids known to already exist in the database, snapshotted at load time
    /// (GetByIdAsync). Used by UpdateAsync to tell a genuinely new owned Finding
    /// (added via SafetyWalk.AddFinding after loading) apart from one that was
    /// already persisted — see UpdateAsync for why this matters. The repository is
    /// DI-scoped 1:1 with the EhsDbContext (AddScoped, same as the DbContext), so
    /// this instance-level cache lives exactly as long as the unit of work it
    /// tracks changes for.
    /// </summary>
    private readonly Dictionary<Guid, HashSet<Guid>> _loadedFindingIds = new();

    public SafetyWalkRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get walk by ID (findings included — owned collection).</summary>
    public async Task<SafetyWalk?> GetByIdAsync(Guid safetyWalkId, Guid tenantId, CancellationToken ct = default)
    {
        var walk = await _context.SafetyWalks
            .FirstOrDefaultAsync(w => w.SafetyWalkId == safetyWalkId && w.TenantId == tenantId, ct)
            .ConfigureAwait(false);

        if (walk is not null)
            _loadedFindingIds[walk.SafetyWalkId] = walk.Findings.Select(f => f.FindingId).ToHashSet();

        return walk;
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

        _loadedFindingIds[walk.SafetyWalkId] = walk.Findings.Select(f => f.FindingId).ToHashSet();
    }

    public async Task UpdateAsync(SafetyWalk walk, CancellationToken ct = default)
    {
        // Owned Findings created via a domain method (SafetyWalk.AddFinding) after the
        // walk was loaded carry a client-generated (non-default) Guid key. EF Core's
        // Update()/DetectChanges cannot distinguish such a brand-new owned entity from
        // a pre-existing one purely from the key value, so a newly discovered Finding
        // defaults to Modified — which issues an UPDATE for a safety_walk_findings row
        // that was never INSERTed (0 rows affected -> spurious
        // DbUpdateConcurrencyException, even though no concurrency token is involved
        // at all). Note: querying _context.ChangeTracker.Entries<T>() itself runs
        // DetectChanges as a side effect, so a "before" snapshot taken that way would
        // already include the new Finding — the snapshot must come from the
        // repository's own bookkeeping (captured in GetByIdAsync/AddAsync), not from
        // the change tracker.
        var knownFindingIds = _loadedFindingIds.TryGetValue(walk.SafetyWalkId, out var ids)
            ? ids
            : new HashSet<Guid>();

        _context.SafetyWalks.Update(walk);

        foreach (var findingEntry in _context.ChangeTracker.Entries<SafetyWalkFinding>())
        {
            if (findingEntry.Entity.SafetyWalkId == walk.SafetyWalkId
                && findingEntry.State == EntityState.Modified
                && !knownFindingIds.Contains(findingEntry.Entity.FindingId))
            {
                findingEntry.State = EntityState.Added;
            }
        }

        await _context.SaveChangesAsync(ct).ConfigureAwait(false);

        _loadedFindingIds[walk.SafetyWalkId] = walk.Findings.Select(f => f.FindingId).ToHashSet();
    }
}
