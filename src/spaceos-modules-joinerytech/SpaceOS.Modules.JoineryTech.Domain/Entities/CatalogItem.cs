using System.Text.Json;

namespace SpaceOS.Modules.JoineryTech.Domain.Entities;

/// <summary>
/// Represents a catalog item (product or service) in the system.
/// Catalog items are tenant-isolated and can be categorized.
/// </summary>
public class CatalogItem
{
    /// <summary>
    /// Unique identifier for the catalog item.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Tenant this item belongs to (multi-tenant isolation).
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// Category this item belongs to (optional).
    /// </summary>
    public Guid? CategoryId { get; set; }

    /// <summary>
    /// Display name of the item.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Stock Keeping Unit (SKU) - unique identifier within tenant.
    /// </summary>
    public string? Sku { get; set; }

    /// <summary>
    /// Detailed description of the item.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Base price of the item (before discounts, taxes, etc.).
    /// </summary>
    public decimal? BasePrice { get; set; }

    /// <summary>
    /// Unit of measurement (e.g., "unit", "m2", "kg", "hour").
    /// </summary>
    public string Unit { get; set; } = "unit";

    /// <summary>
    /// Current status of the catalog item.
    /// </summary>
    public CatalogItemStatus Status { get; set; }

    /// <summary>
    /// Additional metadata stored as JSON (flexible attributes).
    /// Example: {"color": "oak", "dimensions": "2800x2070mm"}
    /// </summary>
    public string MetadataJson { get; set; } = "{}";

    /// <summary>
    /// Timestamp when the item was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Timestamp of last item update.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public CatalogCategory? Category { get; set; }

    /// <summary>
    /// Gets the metadata as a dictionary.
    /// </summary>
    public Dictionary<string, object>? GetMetadata()
    {
        if (string.IsNullOrWhiteSpace(MetadataJson) || MetadataJson == "{}")
            return null;

        return JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
    }

    /// <summary>
    /// Sets the metadata from a dictionary.
    /// </summary>
    public void SetMetadata(Dictionary<string, object>? metadata)
    {
        MetadataJson = metadata == null || metadata.Count == 0
            ? "{}"
            : JsonSerializer.Serialize(metadata);
    }

    /// <summary>
    /// Checks if the item is available for ordering (active status).
    /// </summary>
    public bool IsAvailable() => Status == CatalogItemStatus.Active;

    /// <summary>
    /// Checks if the item has a SKU defined.
    /// </summary>
    public bool HasSku() => !string.IsNullOrWhiteSpace(Sku);
}

/// <summary>
/// Catalog item status enumeration.
/// </summary>
public enum CatalogItemStatus
{
    /// <summary>Item is active and available for ordering.</summary>
    Active,

    /// <summary>Item is discontinued (no longer available).</summary>
    Discontinued,

    /// <summary>Item is in draft state (not yet published).</summary>
    Draft
}
