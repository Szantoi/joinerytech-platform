namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Response DTO for document details.
/// </summary>
public record DocumentDto(
    Guid Id,
    Guid TenantId,
    Guid FolderId,
    string Title,
    string? Description,
    string[] Tags,
    int CurrentVersion,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
