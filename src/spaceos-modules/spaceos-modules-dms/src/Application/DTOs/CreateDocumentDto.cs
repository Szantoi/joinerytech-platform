using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Request DTO for creating a new document.
/// </summary>
public record CreateDocumentDto(
    Guid FolderId,
    string Title,
    string? Description,
    string[] Tags,
    string ContentType,
    long FileSizeBytes
);
