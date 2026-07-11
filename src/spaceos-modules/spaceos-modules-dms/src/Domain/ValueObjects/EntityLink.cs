using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Represents a link between a document and an entity (Order, Project, Asset, etc.).
/// </summary>
public class EntityLink : ValueObject
{
    /// <summary>
    /// Type of entity this document is linked to.
    /// </summary>
    public EntityType EntityType { get; init; }

    /// <summary>
    /// ID of the entity this document is linked to.
    /// </summary>
    public Guid EntityId { get; init; }

    /// <summary>
    /// User who created this link.
    /// </summary>
    public UserId LinkedByUserId { get; init; } = null!;

    /// <summary>
    /// When this link was created.
    /// </summary>
    public DateTime LinkedAt { get; init; }

    private EntityLink() { }

    public EntityLink(EntityType entityType, Guid entityId, UserId linkedByUserId, DateTime linkedAt)
    {
        if (entityId == Guid.Empty)
            throw new ArgumentException("Entity ID cannot be empty", nameof(entityId));

        EntityType = entityType;
        EntityId = entityId;
        LinkedByUserId = linkedByUserId ?? throw new ArgumentNullException(nameof(linkedByUserId));
        LinkedAt = linkedAt;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return EntityType;
        yield return EntityId;
    }
}
