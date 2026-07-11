namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Data Transfer Object for Tag.
/// </summary>
public class TagDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
