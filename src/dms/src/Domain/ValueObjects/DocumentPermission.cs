using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Value object representing a document permission grant.
/// </summary>
public record DocumentPermission
{
    public DocumentPermissionId Id { get; init; }
    public PermissionType PermissionType { get; init; }
    public UserId? GrantedToUserId { get; init; }
    public Guid? GrantedToRoleId { get; init; }
    public UserId GrantedByUserId { get; init; }
    public DateTime GrantedAt { get; init; }

    public DocumentPermission(
        DocumentPermissionId id,
        PermissionType permissionType,
        UserId? grantedToUserId,
        Guid? grantedToRoleId,
        UserId grantedBy,
        DateTime grantedAt)
    {
        if (grantedToUserId == null && grantedToRoleId == null)
            throw new DomainException("Either userId or roleId required");

        Id = id;
        PermissionType = permissionType;
        GrantedToUserId = grantedToUserId;
        GrantedToRoleId = grantedToRoleId;
        GrantedByUserId = grantedBy;
        GrantedAt = grantedAt;
    }
}
