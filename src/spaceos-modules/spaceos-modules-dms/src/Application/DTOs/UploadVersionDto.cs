namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Request DTO for uploading a new document version.
/// </summary>
public record UploadVersionDto(
    int VersionNumber,
    string Comment,
    long FileSizeBytes,
    string ContentHash
);
