using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Tag;

/// <summary>
/// Tag aggregate root for labeling and organizing documents.
/// </summary>
public class Tag : AggregateRoot
{
    public TagId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Color { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private Tag() { }

    /// <summary>
    /// Factory method to create a new tag.
    /// </summary>
    public static Tag Create(
        TagId id,
        TenantId tenantId,
        string name,
        string? color = null)
    {
        return new Tag
        {
            Id = id,
            TenantId = tenantId,
            Name = name,
            Color = color,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Updates the tag name.
    /// </summary>
    public void UpdateName(string newName)
    {
        Name = newName;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the tag color.
    /// </summary>
    public void UpdateColor(string? newColor)
    {
        Color = newColor;
        UpdatedAt = DateTime.UtcNow;
    }
}
