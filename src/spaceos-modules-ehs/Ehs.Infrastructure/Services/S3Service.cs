// Ehs.Infrastructure/Services/S3Service.cs

using Amazon.S3;
using Amazon.S3.Model;
using Ehs.Domain.Interfaces;

namespace Ehs.Infrastructure.Services;

/// <summary>
/// AWS S3 service implementation for presigned URL generation.
/// </summary>
public sealed class S3Service : IS3Service
{
    private readonly IAmazonS3 _s3Client;
    private readonly string _bucketName;

    public S3Service(IAmazonS3 s3Client, string bucketName)
    {
        _s3Client = s3Client;
        _bucketName = bucketName;
    }

    public async Task<(string UploadUrl, string S3Key, DateTimeOffset ExpiresAt)> GeneratePresignedUploadUrlAsync(
        string filename,
        string contentType,
        long maxSizeBytes = 5_242_880)
    {
        // Generate unique S3 key: ehs/photos/{timestamp}-{guid}.{ext}
        var extension = Path.GetExtension(filename).ToLowerInvariant();
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var uniqueId = Guid.NewGuid().ToString("N");
        var s3Key = $"ehs/photos/{timestamp}-{uniqueId}{extension}";

        // Generate presigned URL (15 min TTL)
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(15);
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = s3Key,
            Verb = HttpVerb.PUT,
            Expires = expiresAt.UtcDateTime,
            ContentType = contentType
        };

        var uploadUrl = await _s3Client.GetPreSignedURLAsync(request).ConfigureAwait(false);

        return (uploadUrl, s3Key, expiresAt);
    }
}
