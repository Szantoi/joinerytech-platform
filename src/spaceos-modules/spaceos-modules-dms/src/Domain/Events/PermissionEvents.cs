using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// A permission has been granted to a user for a document.
/// </summary>
public record DocumentPermissionGrantedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    PermissionType PermissionType,
    UserId GrantedToUserId,
    UserId GrantedByUserId) : DomainEvent;

/// <summary>
/// A permission has been revoked from a user for a document.
/// </summary>
public record DocumentPermissionRevokedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    PermissionType PermissionType,
    UserId UserId) : DomainEvent;
