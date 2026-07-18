namespace SpaceOS.Modules.Kontrolling.Infrastructure.Persistence.Repositories;

using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Kontrolling.Application.Services;
using SpaceOS.Modules.Kontrolling.Domain.Aggregates;

/// <summary>
/// Repository for OverheadConfig aggregate.
/// Implements hybrid pattern: relies on RLS for tenant isolation.
/// </summary>
public sealed class OverheadConfigRepository : IOverheadConfigRepository
{
    private readonly KontrollingDbContext _context;

    public OverheadConfigRepository(KontrollingDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get overhead configuration for a tenant (RLS isolation).
    /// NOTE: RLS ensures only current tenant's config is visible.
    /// </summary>
    public async Task<OverheadConfig?> GetByTenantAsync(
        Guid tenantId,
        CancellationToken ct = default)
    {
        // Tracked read: callers mutate the aggregate (AddRule/RemoveRule) and then call
        // SaveAsync on the same context. The previous AsNoTracking read produced a
        // detached copy whose re-attach in SaveAsync collided with the already-tracked
        // instance ("another instance with the same key is already being tracked").
        return await _context.OverheadConfigs
            .Include(o => o.OverheadRules) // Include owned collection
            .FirstOrDefaultAsync(o => o.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Save (insert or update) overhead configuration.
    /// </summary>
    public async Task SaveAsync(
        OverheadConfig config,
        CancellationToken ct = default)
    {
        // If the aggregate is already tracked (GetByTenantAsync is a tracked read),
        // SaveChanges alone persists the mutations; Update()/re-attach on a second
        // instance with the same key would throw. Only a detached, brand-new aggregate
        // needs an explicit insert.
        if (_context.Entry(config).State == EntityState.Detached)
        {
            var exists = await _context.OverheadConfigs
                .AsNoTracking()
                .AnyAsync(o => o.OverheadConfigId == config.OverheadConfigId, ct)
                .ConfigureAwait(false);

            if (!exists)
            {
                await _context.OverheadConfigs.AddAsync(config, ct).ConfigureAwait(false);
            }
            else
            {
                _context.OverheadConfigs.Update(config);
            }
        }

        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
