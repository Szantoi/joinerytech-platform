using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;

/// <summary>
/// DocumentCategory aggregate root for organizing documents by category.
/// </summary>
public class DocumentCategory : AggregateRoot
{
    public DocumentCategoryId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; }
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private DocumentCategory() { }

    /// <summary>
    /// Factory method to create a new document category.
    /// </summary>
    public static DocumentCategory Create(
        DocumentCategoryId id,
        TenantId tenantId,
        string name,
        string? description = null)
    {
        return new DocumentCategory
        {
            Id = id,
            TenantId = tenantId,
            Name = name,
            Description = description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Updates the category name.
    /// </summary>
    public void UpdateName(string newName)
    {
        Name = newName;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Updates the category description.
    /// </summary>
    public void UpdateDescription(string? newDescription)
    {
        Description = newDescription;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Deactivates the category.
    /// </summary>
    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Activates the category.
    /// </summary>
    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
