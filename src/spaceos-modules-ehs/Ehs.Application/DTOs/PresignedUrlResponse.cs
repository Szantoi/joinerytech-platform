// Ehs.Application/DTOs/PresignedUrlResponse.cs

namespace Ehs.Application.DTOs;

/// <summary>
/// Response DTO for presigned URL generation.
/// </summary>
public sealed record PresignedUrlResponse
{
    public string UploadUrl { get; init; } = string.Empty;
    public string S3Key { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; init; }
}
