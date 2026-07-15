using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Infrastructure.Data;

namespace SpaceOS.Modules.Ehs.Infrastructure.Repositories;

/// <summary>
/// Repository implementation for PpeItem aggregate (PPE catalogue).
/// </summary>
public class PpeItemRepository : IPpeItemRepository
{
    private readonly EhsDbContext _context;

    public PpeItemRepository(EhsDbContext context)
    {
        _context = context;
    }

    /// <summary>Get PPE item by ID with tenant filtering.</summary>
    public async Task<PpeItem?> GetByIdAsync(Guid ppeItemId, Guid tenantId, CancellationToken ct = default)
    {
        return await _context.PpeItems
            .FirstOrDefaultAsync(i => i.PpeItemId == ppeItemId && i.TenantId == tenantId, ct)
            .ConfigureAwait(false);
    }

    /// <summary>List catalogue items with filtering (activeOnly, category).</summary>
    public async Task<List<PpeItem>> ListAsync(PpeItemFilter filter, Guid tenantId, CancellationToken ct = default)
    {
        var query = _context.PpeItems
            .Where(i => i.TenantId == tenantId);

        if (filter.ActiveOnly == true)
            query = query.Where(i => i.IsActive);

        if (filter.Category.HasValue)
            query = query.Where(i => i.Category == filter.Category.Value);

        return await query
            .OrderBy(i => i.Name)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(PpeItem item, CancellationToken ct = default)
    {
        await _context.PpeItems.AddAsync(item, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(PpeItem item, CancellationToken ct = default)
    {
        _context.PpeItems.Update(item);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
