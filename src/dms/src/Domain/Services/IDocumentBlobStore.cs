namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Port for the document blob (file content) storage — DMS-BE-HOST.
///
/// The REAL store (S3/MinIO/Azure Blob/DB) is an infrastructure decision and a
/// follow-up: the current API surface carries only the fileLabel (portal MSW
/// contract — no multipart upload yet), so nothing calls SaveAsync in the
/// request path today. The port + the filesystem stub
/// (FileSystemDocumentBlobStore) are in place so the multipart/presigned-url
/// flow only has to plug in here.
///
/// BlobPath is an opaque, store-relative identifier persisted on
/// DocumentVersionEntry.BlobPath.
/// </summary>
public interface IDocumentBlobStore
{
    /// <summary>Saves version content and returns the opaque blob path.</summary>
    Task<string> SaveAsync(
        Guid tenantId,
        Guid documentId,
        int versionNumber,
        string fileLabel,
        Stream content,
        CancellationToken ct = default);

    /// <summary>Opens version content for reading; the caller disposes the stream.</summary>
    Task<Stream> OpenReadAsync(string blobPath, CancellationToken ct = default);

    /// <summary>True when the blob exists.</summary>
    Task<bool> ExistsAsync(string blobPath, CancellationToken ct = default);

    /// <summary>Deletes the blob (idempotent — missing blob is a no-op).</summary>
    Task DeleteAsync(string blobPath, CancellationToken ct = default);
}
