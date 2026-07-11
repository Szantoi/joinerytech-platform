// Ehs.Domain/Interfaces/IS3Service.cs

namespace Ehs.Domain.Interfaces;

/// <summary>
/// Service interface for S3 operations (presigned URL generation).
/// </summary>
public interface IS3Service
{
    /// <summary>
    /// Generate a presigned URL for uploading a photo to S3.
    /// </summary>
    /// <param name="filename">Original filename (e.g., "incident_20260622.jpg").</param>
    /// <param name="contentType">MIME type (e.g., "image/jpeg").</param>
    /// <param name="maxSizeBytes">Maximum file size in bytes (default 5MB).</param>
    /// <returns>Presigned URL and S3 object key.</returns>
    Task<(string UploadUrl, string S3Key, DateTimeOffset ExpiresAt)> GeneratePresignedUploadUrlAsync(
        string filename,
        string contentType,
        long maxSizeBytes = 5_242_880); // 5MB default
}
