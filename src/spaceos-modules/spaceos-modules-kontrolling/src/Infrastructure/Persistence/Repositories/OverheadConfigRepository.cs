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
        return await _context.OverheadConfigs
            .Include(o => o.OverheadRules) // Include owned collection
            .AsNoTracking()
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
        var existing = await _context.OverheadConfigs
            .FirstOrDefaultAsync(o => o.OverheadConfigId == config.OverheadConfigId, ct)
            .ConfigureAwait(false);

        if (existing is null)
        {
            // Insert
            await _context.OverheadConfigs.AddAsync(config, ct).ConfigureAwait(false);
        }
        else
        {
            // Update (EF Core will track changes)
            _context.OverheadConfigs.Update(config);
        }

        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
