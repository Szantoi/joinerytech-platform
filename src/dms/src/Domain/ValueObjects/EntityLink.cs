using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Value object representing a link between a document and an entity.
/// </summary>
public record EntityLink
{
    public EntityLinkId Id { get; init; }
    public EntityType EntityType { get; init; }
    public Guid EntityId { get; init; }
    public UserId LinkedByUserId { get; init; }
    public DateTime LinkedAt { get; init; }

    public EntityLink(
        EntityLinkId id,
        EntityType entityType,
        Guid entityId,
        UserId linkedBy,
        DateTime linkedAt)
    {
        Id = id;
        EntityType = entityType;
        EntityId = entityId;
        LinkedByUserId = linkedBy;
        LinkedAt = linkedAt;
    }
}
