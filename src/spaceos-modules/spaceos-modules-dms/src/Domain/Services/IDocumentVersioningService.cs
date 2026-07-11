using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Service for managing document versions.
/// </summary>
public interface IDocumentVersioningService
{
    /// <summary>
    /// Gets a specific version of a document.
    /// </summary>
    DocumentVersion? GetVersion(Document document, int versionNumber);

    /// <summary>
    /// Rolls back a document to a previous version (creates new version with old content).
    /// </summary>
    Task<DocumentVersion> RollbackToVersionAsync(
        Document document,
        int versionNumber,
        UserId userId,
        IBlobStorageService blobStorage,
        CancellationToken ct = default);

    /// <summary>
    /// Verifies that a version's content matches its SHA-256 hash.
    /// </summary>
    Task<bool> VerifyIntegrityAsync(
        DocumentVersion version,
        IBlobStorageService blobStorage,
        CancellationToken ct = default);
}
