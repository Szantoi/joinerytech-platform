using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository for Document aggregate persistence and querying.
/// </summary>
public interface IDocumentRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get document by ID (with RLS enforcement).
    /// </summary>
    Task<Document?> GetByIdAsync(DocumentId id, CancellationToken ct = default);

    /// <summary>
    /// Get documents by entity link (all documents linked to a specific Order/Project/etc.).
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetByEntityLinkAsync(
        EntityType entityType,
        Guid entityId,
        CancellationToken ct = default);

    /// <summary>
    /// Get documents uploaded by a user.
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetByUploaderAsync(
        UserId uploaderId,
        int skip = 0,
        int take = 50,
        CancellationToken ct = default);

    /// <summary>
    /// Search documents (full-text search with filters).
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> SearchAsync(
        string query,
        SearchFilters filters,
        int skip = 0,
        int take = 50,
        CancellationToken ct = default);

    /// <summary>
    /// Get recently uploaded documents.
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetRecentAsync(
        int count = 20,
        CancellationToken ct = default);

    /// <summary>
    /// Get documents by tag.
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetByTagAsync(
        string tag,
        int skip = 0,
        int take = 50,
        CancellationToken ct = default);

    /// <summary>
    /// Get documents expiring within date range.
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetByExpiryDateRangeAsync(
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken ct = default);

    /// <summary>
    /// Get expired documents.
    /// </summary>
    Task<IEnumerable<DocumentMetadata>> GetExpiredDocumentsAsync(
        DateOnly today,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new document.
    /// </summary>
    Task AddAsync(Document document, CancellationToken ct = default);

    /// <summary>
    /// Update existing document (EF Core will track changes automatically).
    /// </summary>
    Task UpdateAsync(Document document, CancellationToken ct = default);

    // Note: Delete is soft-delete via Document.SoftDelete() + UpdateAsync()
}
