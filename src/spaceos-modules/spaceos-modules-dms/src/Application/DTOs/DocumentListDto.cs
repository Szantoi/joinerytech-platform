namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Response DTO for document list items (lightweight for search results).
/// </summary>
public record DocumentListDto(
    Guid Id,
    string Title,
    string[] Tags,
    int CurrentVersion,
    DateTime CreatedAt
);
