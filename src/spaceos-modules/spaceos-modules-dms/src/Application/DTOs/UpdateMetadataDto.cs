namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Request DTO for updating document metadata.
/// </summary>
public record UpdateMetadataDto(
    string Title,
    string? Description,
    string[] Tags
);
