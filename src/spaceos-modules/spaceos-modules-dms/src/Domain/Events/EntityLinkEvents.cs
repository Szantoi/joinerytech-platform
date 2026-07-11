using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Document has been linked to an entity (Order, Project, Asset, etc.).
/// </summary>
public record DocumentLinkedToEntityEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    EntityType EntityType,
    Guid EntityId,
    UserId LinkedByUserId) : DomainEvent;

/// <summary>
/// Document has been unlinked from an entity.
/// </summary>
public record DocumentUnlinkedFromEntityEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    EntityType EntityType,
    Guid EntityId) : DomainEvent;
