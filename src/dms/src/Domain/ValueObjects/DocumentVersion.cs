using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Value object representing a document version with immutable versioning.
/// </summary>
public record DocumentVersion
{
    public DocumentVersionId Id { get; init; }
    public int VersionNumber { get; init; }
    public string FileUrl { get; init; }
    public string Hash { get; init; }
    public long SizeBytes { get; init; }
    public UserId UploadedByUserId { get; init; }
    public DateTime UploadedAt { get; init; }
    public string? ChangeNotes { get; init; }

    public DocumentVersion(
        DocumentVersionId id,
        int versionNumber,
        string fileUrl,
        string hash,
        long sizeBytes,
        UserId uploadedBy,
        DateTime uploadedAt,
        string? changeNotes = null)
    {
        if (versionNumber <= 0)
            throw new DomainException("VersionNumber must be >0");

        if (string.IsNullOrWhiteSpace(fileUrl))
            throw new DomainException("FileUrl required");

        if (string.IsNullOrWhiteSpace(hash) || hash.Length != 64)
            throw new DomainException("Hash must be SHA-256 (64 hex chars)");

        Id = id;
        VersionNumber = versionNumber;
        FileUrl = fileUrl;
        Hash = hash;
        SizeBytes = sizeBytes;
        UploadedByUserId = uploadedBy;
        UploadedAt = uploadedAt;
        ChangeNotes = changeNotes;
    }
}
