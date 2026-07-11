using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Repositories;

/// <summary>
/// DocumentCategory repository implementation with RLS multi-tenancy support.
/// NOTE: TenantId is NOT in method signatures — RLS handles tenant isolation!
/// </summary>
public class DocumentCategoryRepository : IDocumentCategoryRepository
{
    private readonly DMSDbContext _context;

    public DocumentCategoryRepository(DMSDbContext context)
    {
        _context = context;
    }

    public async Task<DocumentCategory?> GetByIdAsync(DocumentCategoryId id, CancellationToken ct = default)
    {
        return await _context.DocumentCategories
            .FirstOrDefaultAsync(dc => dc.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<DocumentCategory>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.DocumentCategories
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<DocumentCategory?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        return await _context.DocumentCategories
            .FirstOrDefaultAsync(dc => dc.Name == name, ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<DocumentCategory>> GetActiveAsync(CancellationToken ct = default)
    {
        return await _context.DocumentCategories
            .Where(dc => dc.IsActive)
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(DocumentCategory category, CancellationToken ct = default)
    {
        await _context.DocumentCategories.AddAsync(category, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(DocumentCategory category, CancellationToken ct = default)
    {
        _context.DocumentCategories.Update(category);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task DeleteAsync(DocumentCategoryId id, CancellationToken ct = default)
    {
        var category = await GetByIdAsync(id, ct).ConfigureAwait(false);
        if (category != null)
        {
            _context.DocumentCategories.Remove(category);
            await _context.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }
}
