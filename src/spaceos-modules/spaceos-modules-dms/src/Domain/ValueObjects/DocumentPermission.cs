using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Represents an explicit permission grant for a document.
/// </summary>
public class DocumentPermission : ValueObject
{
    /// <summary>
    /// Type of permission granted (View, Edit, Delete, Share).
    /// </summary>
    public PermissionType PermissionType { get; init; }

    /// <summary>
    /// User who receives this permission.
    /// </summary>
    public UserId GrantedToUserId { get; init; } = null!;

    /// <summary>
    /// User who granted this permission.
    /// </summary>
    public UserId GrantedByUserId { get; init; } = null!;

    /// <summary>
    /// When this permission was granted.
    /// </summary>
    public DateTime GrantedAt { get; init; }

    private DocumentPermission() { }

    public DocumentPermission(
        PermissionType permissionType,
        UserId grantedToUserId,
        UserId grantedByUserId,
        DateTime grantedAt)
    {
        PermissionType = permissionType;
        GrantedToUserId = grantedToUserId ?? throw new ArgumentNullException(nameof(grantedToUserId));
        GrantedByUserId = grantedByUserId ?? throw new ArgumentNullException(nameof(grantedByUserId));
        GrantedAt = grantedAt;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return PermissionType;
        yield return GrantedToUserId;
    }
}
