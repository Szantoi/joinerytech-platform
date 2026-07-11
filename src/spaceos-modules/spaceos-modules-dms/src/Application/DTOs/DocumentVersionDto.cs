namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Response DTO for document version history.
/// </summary>
public record DocumentVersionDto(
    Guid Id,
    int VersionNumber,
    string Comment,
    long FileSizeBytes,
    string ContentHash,
    DateTime UploadedAt
);
