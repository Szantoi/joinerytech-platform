using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Service for searching documents by metadata, tags, and content.
/// </summary>
public interface IDocumentSearchService
{
    /// <summary>
    /// Searches documents matching the query and filters.
    /// </summary>
    Task<IEnumerable<DocumentSearchResult>> SearchAsync(
        string query,
        SearchFilters filters,
        int skip = 0,
        int take = 50,
        CancellationToken ct = default);
}

/// <summary>
/// Search result projection.
/// </summary>
public record DocumentSearchResult(
    DocumentId DocumentId,
    string FileName,
    string Description,
    IReadOnlyList<string> Tags,
    int MatchScore);

/// <summary>
/// Filters for document search.
/// </summary>
public record SearchFilters(
    IEnumerable<string>? Tags = null,
    EntityType? EntityType = null,
    Guid? EntityId = null,
    UserId? UploadedByUserId = null,
    DateOnly? StartDate = null,
    DateOnly? EndDate = null,
    DocumentStatus? Status = null,
    bool IncludeArchived = false,
    bool IncludeDeleted = false);
