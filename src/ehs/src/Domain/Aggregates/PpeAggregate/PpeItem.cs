using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;

/// <summary>
/// PPE item aggregate root — the PPE (EVE) catalogue/master data.
/// No FSM: master data with soft deactivation. Issuances (PpeIssuance)
/// reference items by PpeItemId.
/// </summary>
public class PpeItem : AggregateRoot
{
    public Guid PpeItemId { get; private set; }
    public Guid TenantId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public PpeCategory Category { get; private set; }

    /// <summary>Reference standard, e.g. "EN 388" (optional)</summary>
    public string? StandardRef { get; private set; }

    /// <summary>
    /// Default lifetime in months — used to derive the ExpiresAt of an issuance
    /// when no explicit expiry is provided (null = no default expiry).
    /// </summary>
    public int? DefaultLifetimeMonths { get; private set; }

    /// <summary>Soft-delete flag — inactive items cannot be issued</summary>
    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private PpeItem() { }  // EF Core

    /// <summary>
    /// Create a new active PPE catalogue item.
    /// </summary>
    public static PpeItem Create(
        Guid tenantId,
        string name,
        PpeCategory category,
        string? standardRef = null,
        int? defaultLifetimeMonths = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        if (defaultLifetimeMonths.HasValue && defaultLifetimeMonths.Value <= 0)
            throw new ArgumentException("DefaultLifetimeMonths must be positive", nameof(defaultLifetimeMonths));

        return new PpeItem
        {
            PpeItemId = Guid.NewGuid(),
            TenantId = tenantId,
            Name = name,
            Category = category,
            StandardRef = standardRef,
            DefaultLifetimeMonths = defaultLifetimeMonths,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    /// <summary>
    /// Update catalogue data. Guard: only active items can be updated.
    /// </summary>
    public void Update(string name, PpeCategory category, string? standardRef, int? defaultLifetimeMonths)
    {
        if (!IsActive)
            throw new InvalidOperationException("Cannot update an inactive PPE item");

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        if (defaultLifetimeMonths.HasValue && defaultLifetimeMonths.Value <= 0)
            throw new ArgumentException("DefaultLifetimeMonths must be positive", nameof(defaultLifetimeMonths));

        Name = name;
        Category = category;
        StandardRef = standardRef;
        DefaultLifetimeMonths = defaultLifetimeMonths;
    }

    /// <summary>
    /// Soft-deactivate the item (existing issuances remain valid).
    /// Guard: already inactive.
    /// </summary>
    public void Deactivate()
    {
        if (!IsActive)
            throw new InvalidOperationException("PPE item is already inactive");

        IsActive = false;
    }
}
