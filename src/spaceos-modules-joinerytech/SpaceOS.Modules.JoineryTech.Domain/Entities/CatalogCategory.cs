namespace SpaceOS.Modules.JoineryTech.Domain.Entities;

/// <summary>
/// Represents a hierarchical catalog category for organizing products/services.
/// Supports self-referencing parent-child relationships for nested categories.
/// </summary>
public class CatalogCategory
{
    /// <summary>
    /// Unique identifier for the catalog category.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Tenant this category belongs to (multi-tenant isolation).
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Parent category ID (null if root-level category).
    /// </summary>
    public Guid? ParentId { get; set; }

    /// <summary>
    /// Display name of the category.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// URL-friendly identifier (unique within tenant).
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Optional description of the category.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Display order for sorting categories (ascending).
    /// </summary>
    public int DisplayOrder { get; set; }

    /// <summary>
    /// Category visibility status.
    /// </summary>
    public CategoryStatus Status { get; set; }

    /// <summary>
    /// Timestamp when the category was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Timestamp of last category update.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public CatalogCategory? Parent { get; set; }
    public ICollection<CatalogCategory> Children { get; set; } = new List<CatalogCategory>();
    public ICollection<CatalogItem> Items { get; set; } = new List<CatalogItem>();

    /// <summary>
    /// Checks if this category is a root-level category (no parent).
    /// </summary>
    public bool IsRoot() => ParentId == null;

    /// <summary>
    /// Checks if this category has child categories.
    /// </summary>
    public bool HasChildren() => Children.Any();
}

/// <summary>
/// Catalog category status enumeration.
/// </summary>
public enum CategoryStatus
{
    /// <summary>Category is visible and active.</summary>
    Active,

    /// <summary>Category is hidden/inactive.</summary>
    Inactive
}
