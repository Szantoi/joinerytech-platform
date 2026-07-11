namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Response DTO for folder tree (recursive structure).
/// </summary>
public record FolderTreeDto(
    Guid Id,
    string Name,
    List<FolderTreeDto> Subfolders
);
