using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;
using SpaceOS.Modules.Ehs.Domain.Events;

namespace SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;

/// <summary>
/// EHS location aggregate root — hierarchical location registry
/// (Site → Building/Hall → Zone). No FSM: master data with soft deactivation.
/// Hierarchy is expressed through ParentLocationId; clients build the tree
/// from the flat list.
/// </summary>
public class EhsLocation : AggregateRoot
{
    public Guid LocationId { get; private set; }
    public Guid TenantId { get; private set; }

    /// <summary>Short unique code, e.g. "VAC-A"</summary>
    public string Code { get; private set; } = string.Empty;

    /// <summary>Display name, e.g. "Vác — főüzem / A csarnok"</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>Parent node in the location tree (null = root/site level)</summary>
    public Guid? ParentLocationId { get; private set; }

    public LocationKind Kind { get; private set; }

    /// <summary>Soft-delete flag — inactive locations are hidden from pickers</summary>
    public bool IsActive { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private EhsLocation() { }  // EF Core

    /// <summary>
    /// Create a new active location node.
    /// </summary>
    public static EhsLocation Create(
        Guid tenantId,
        string code,
        string name,
        LocationKind kind,
        Guid? parentLocationId = null)
    {
        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Code is required", nameof(code));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        var location = new EhsLocation
        {
            LocationId = Guid.NewGuid(),
            TenantId = tenantId,
            Code = code,
            Name = name,
            Kind = kind,
            ParentLocationId = parentLocationId,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow
        };

        location.AddDomainEvent(new LocationCreatedEvent(
            location.LocationId,
            location.Kind));

        return location;
    }

    /// <summary>
    /// Rename / re-classify / move the location within the tree.
    /// Guard: inactive locations cannot be updated; a node cannot be its own parent.
    /// (Deep cycle detection across the tree is enforced at the Application layer.)
    /// </summary>
    public void Update(string code, string name, LocationKind kind, Guid? parentLocationId)
    {
        if (!IsActive)
            throw new InvalidOperationException("Cannot update an inactive location");

        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Code is required", nameof(code));

        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        if (parentLocationId == LocationId)
            throw new ArgumentException("A location cannot be its own parent", nameof(parentLocationId));

        Code = code;
        Name = name;
        Kind = kind;
        ParentLocationId = parentLocationId;
    }

    /// <summary>
    /// Soft-deactivate the location (instead of hard delete — incidents keep referencing it).
    /// Guard: already inactive; active children must be deactivated first
    /// (the child check is performed by the caller against the repository).
    /// </summary>
    public void Deactivate(bool hasActiveChildren)
    {
        if (!IsActive)
            throw new InvalidOperationException("Location is already inactive");

        if (hasActiveChildren)
            throw new InvalidOperationException("Cannot deactivate a location that has active child locations");

        IsActive = false;

        AddDomainEvent(new LocationDeactivatedEvent(LocationId));
    }
}
