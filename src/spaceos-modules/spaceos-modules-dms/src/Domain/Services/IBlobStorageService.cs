namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Interface for blob storage operations (Azure Blob Storage, AWS S3, MinIO, etc.).
/// Implementation will be in Infrastructure layer.
/// </summary>
public interface IBlobStorageService
{
    /// <summary>
    /// Uploads a file to blob storage.
    /// </summary>
    /// <param name="fileStream">File content stream</param>
    /// <param name="blobPath">Path/key in blob storage (e.g., "tenant-id/document-id/version/filename.pdf")</param>
    /// <param name="contentType">MIME type of the file</param>
    /// <returns>Public URL to access the uploaded file</returns>
    Task<string> UploadAsync(Stream fileStream, string blobPath, string contentType, CancellationToken ct = default);

    /// <summary>
    /// Downloads a file from blob storage.
    /// </summary>
    /// <param name="blobPath">Path/key in blob storage</param>
    /// <returns>File content stream</returns>
    Task<Stream> DownloadAsync(string blobPath, CancellationToken ct = default);

    /// <summary>
    /// Deletes a file from blob storage (hard delete, not recoverable).
    /// </summary>
    /// <param name="blobPath">Path/key in blob storage</param>
    Task DeleteAsync(string blobPath, CancellationToken ct = default);

    /// <summary>
    /// Checks if a file exists in blob storage.
    /// </summary>
    /// <param name="blobPath">Path/key in blob storage</param>
    /// <returns>True if file exists, false otherwise</returns>
    Task<bool> ExistsAsync(string blobPath, CancellationToken ct = default);
}
