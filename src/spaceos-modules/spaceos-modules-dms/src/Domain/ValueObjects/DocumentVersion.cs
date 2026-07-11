using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Represents a specific version of a document.
/// Versions are immutable - once uploaded, they cannot be modified.
/// </summary>
public class DocumentVersion
{
    /// <summary>
    /// Unique identifier for this version.
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Sequential version number (1, 2, 3, ...).
    /// </summary>
    public int VersionNumber { get; init; }

    /// <summary>
    /// Blob storage URL where the file is stored.
    /// </summary>
    public string FileUrl { get; init; } = string.Empty;

    /// <summary>
    /// SHA-256 hash for file integrity verification.
    /// </summary>
    public string Hash { get; init; } = string.Empty;

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long SizeBytes { get; init; }

    /// <summary>
    /// User who uploaded this version.
    /// </summary>
    public UserId UploadedByUserId { get; init; } = null!;

    /// <summary>
    /// When this version was uploaded.
    /// </summary>
    public DateTime UploadedAt { get; init; }

    /// <summary>
    /// Optional notes describing what changed in this version.
    /// </summary>
    public string ChangeNotes { get; init; } = string.Empty;

    private DocumentVersion() { }

    public DocumentVersion(
        Guid id,
        int versionNumber,
        string fileUrl,
        string hash,
        long sizeBytes,
        UserId uploadedByUserId,
        DateTime uploadedAt,
        string changeNotes)
    {
        if (versionNumber < 1)
            throw new ArgumentException("Version number must be >= 1", nameof(versionNumber));

        if (string.IsNullOrWhiteSpace(fileUrl))
            throw new ArgumentException("File URL is required", nameof(fileUrl));

        if (string.IsNullOrWhiteSpace(hash))
            throw new ArgumentException("Hash is required", nameof(hash));

        if (sizeBytes <= 0)
            throw new ArgumentException("Size must be > 0", nameof(sizeBytes));

        Id = id;
        VersionNumber = versionNumber;
        FileUrl = fileUrl;
        Hash = hash;
        SizeBytes = sizeBytes;
        UploadedByUserId = uploadedByUserId ?? throw new ArgumentNullException(nameof(uploadedByUserId));
        UploadedAt = uploadedAt;
        ChangeNotes = changeNotes ?? string.Empty;
    }
}
