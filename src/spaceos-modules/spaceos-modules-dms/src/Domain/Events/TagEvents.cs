using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// A tag has been added to a document.
/// </summary>
public record DocumentTagAddedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string Tag) : DomainEvent;

/// <summary>
/// A tag has been removed from a document.
/// </summary>
public record DocumentTagRemovedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string Tag) : DomainEvent;
