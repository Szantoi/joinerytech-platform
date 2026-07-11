using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.Contracts;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Repositories;

/// <summary>
/// Tag repository implementation with RLS multi-tenancy support.
/// NOTE: TenantId is NOT in method signatures — RLS handles tenant isolation!
/// </summary>
public class TagRepository : ITagRepository
{
    private readonly DMSDbContext _context;

    public TagRepository(DMSDbContext context)
    {
        _context = context;
    }

    public async Task<Tag?> GetByIdAsync(TagId id, CancellationToken ct = default)
    {
        return await _context.Tags
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            .ConfigureAwait(false);
    }

    public async Task<IEnumerable<Tag>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.Tags
            .ToListAsync(ct)
            .ConfigureAwait(false);
    }

    public async Task<Tag?> GetByNameAsync(string name, CancellationToken ct = default)
    {
        return await _context.Tags
            .FirstOrDefaultAsync(t => t.Name == name, ct)
            .ConfigureAwait(false);
    }

    public async Task AddAsync(Tag tag, CancellationToken ct = default)
    {
        await _context.Tags.AddAsync(tag, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Tag tag, CancellationToken ct = default)
    {
        _context.Tags.Update(tag);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task DeleteAsync(TagId id, CancellationToken ct = default)
    {
        var tag = await GetByIdAsync(id, ct).ConfigureAwait(false);
        if (tag != null)
        {
            _context.Tags.Remove(tag);
            await _context.SaveChangesAsync(ct).ConfigureAwait(false);
        }
    }
}
