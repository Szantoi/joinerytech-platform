namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Data Transfer Object for DocumentCategory.
/// </summary>
public class DocumentCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
