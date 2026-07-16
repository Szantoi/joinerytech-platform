using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// List filter for documents — the portal list contract mirror
/// (status/type/linkType/q + expiring window). Tenant isolation is handled by
/// RLS (module convention: no TenantId in repository signatures).
/// </summary>
/// <param name="Status">Exact status filter (soft-deleted rows are ALWAYS excluded).</param>
/// <param name="Type">Document type filter.</param>
/// <param name="LinkType">Display-link type filter.</param>
/// <param name="Search">Free-text search: name / id / linkLabel / fileLabel (portal q mirror).</param>
/// <param name="ExpiresOnOrBefore">
/// Expiry window cutoff (today + Dms:Expiry:WarnDays): only rows with
/// ValidUntil ≤ cutoff, excluding Archived (an archived document's expiry is
/// not actionable) — the handler computes the cutoff from config.
/// </param>
public record DocumentFilter(
    DocumentStatus? Status = null,
    DocType? Type = null,
    DocLinkType? LinkType = null,
    string? Search = null,
    DateOnly? ExpiresOnOrBefore = null);

/// <summary>
/// Repository contract for Document aggregate persistence.
/// The Phase-2 entity-link query surface returns with the link persistence
/// (see DocumentEntityTypeConfiguration).
/// </summary>
public interface IDocumentRepository
{
    /// <summary>Loads a document with its version chain; null when missing or soft-deleted.</summary>
    Task<Document?> GetByIdAsync(DocumentId id, CancellationToken ct = default);

    /// <summary>
    /// Lists documents by filter. Ordering (portal contract): expiry window →
    /// earliest ValidUntil first; otherwise most recently updated first.
    /// </summary>
    Task<IReadOnlyList<Document>> ListAsync(DocumentFilter filter, CancellationToken ct = default);

    Task AddAsync(Document document, CancellationToken ct = default);

    Task UpdateAsync(Document document, CancellationToken ct = default);
}
