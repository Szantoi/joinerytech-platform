using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Infrastructure.Persistence.Repositories;

/// <summary>
/// Document repository with RLS multi-tenancy (module convention: no TenantId
/// in signatures — the connection interceptor sets the tenant context).
/// Soft-deleted documents are invisible on every read path (admin restore is a
/// follow-up surface). The version chain auto-includes (owned collection).
/// </summary>
public class DocumentRepository : IDocumentRepository
{
    private readonly DMSDbContext _context;

    public DocumentRepository(DMSDbContext context)
    {
        _context = context;
    }

    public async Task<Document?> GetByIdAsync(DocumentId id, CancellationToken ct = default)
    {
        return await _context.Documents
            .FirstOrDefaultAsync(d => d.Id == id && d.Status != DocumentStatus.Deleted, ct)
            .ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Document>> ListAsync(DocumentFilter filter, CancellationToken ct = default)
    {
        var query = _context.Documents
            .Where(d => d.Status != DocumentStatus.Deleted);

        if (filter.Status is { } status)
            query = query.Where(d => d.Status == status);

        if (filter.Type is { } type)
            query = query.Where(d => d.Type == type);

        if (filter.LinkType is { } linkType)
            query = query.Where(d => d.LinkType == linkType);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            // Portal q mirror: name / linkLabel / fileLabel, case-insensitive.
            // (The portal also matches the id because mock ids are human-readable
            // keys like "DOC-401"; backend ids are GUIDs, so the id axis is
            // intentionally omitted — documented in DMS-BE-HOST.md.)
            var pattern = $"%{filter.Search.Trim()}%";
            query = query.Where(d =>
                EF.Functions.ILike(d.Name, pattern) ||
                EF.Functions.ILike(d.LinkLabel, pattern) ||
                EF.Functions.ILike(d.FileLabel, pattern));
        }

        if (filter.ExpiresOnOrBefore is { } cutoff)
        {
            // Expiry window (portal expiring=true): expired + expiring within the
            // window, Archived excluded, earliest validity first
            query = query
                .Where(d => d.ValidUntil != null
                            && d.ValidUntil <= cutoff
                            && d.Status != DocumentStatus.Archived)
                .OrderBy(d => d.ValidUntil);
        }
        else
        {
            // Default order: most recently updated first
            query = query.OrderByDescending(d => d.UpdatedAt);
        }

        return await query.ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task AddAsync(Document document, CancellationToken ct = default)
    {
        await _context.Documents.AddAsync(document, ct).ConfigureAwait(false);
        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }

    public async Task UpdateAsync(Document document, CancellationToken ct = default)
    {
        // Documents loaded through this repository are tracked — SaveChanges
        // detects modifications AND newly added version entries. Calling
        // Update() unconditionally would force new chain entries (which carry
        // a pre-generated key) into the Modified state → phantom UPDATE with
        // 0 affected rows (DbUpdateConcurrencyException).
        if (_context.Entry(document).State == EntityState.Detached)
            _context.Documents.Update(document);

        await _context.SaveChangesAsync(ct).ConfigureAwait(false);
    }
}
