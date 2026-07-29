using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// The fail-closed evaluation of document permissions.
/// </summary>
/// <remarks>
/// <para>
/// Pure domain logic on state the aggregate already carries — the owner and the grants. It
/// deliberately performs no lookups: an access decision that needs a database round-trip is one
/// that gets skipped "just this once" under load, and this one is never allowed to be skipped.
/// </para>
/// <para>
/// Any grant implies the right to READ. Someone allowed to edit or delete a document but not to
/// open it is not a security boundary, it is a bug that surfaces as an unusable screen.
/// </para>
/// </remarks>
public sealed class DocumentAccessControlService : IDocumentAccessControlService
{
    /// <inheritdoc />
    public bool CanView(Document document, DocumentAccessContext caller)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(caller);

        // A grant of any kind implies visibility; so does the transition rule for documents
        // that pre-date ownership.
        return IsOwner(document, caller)
            || document.OwnerUserId is null
            || document.Permissions.Any(permission => Matches(permission, caller));
    }

    /// <inheritdoc />
    public bool CanEdit(Document document, DocumentAccessContext caller) =>
        HasGrant(document, caller, PermissionType.Edit);

    /// <inheritdoc />
    public bool CanDelete(Document document, DocumentAccessContext caller) =>
        HasGrant(document, caller, PermissionType.Delete);

    /// <inheritdoc />
    public bool CanShare(Document document, DocumentAccessContext caller) =>
        HasGrant(document, caller, PermissionType.Share);

    private static bool HasGrant(Document document, DocumentAccessContext caller, PermissionType type)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(caller);

        // No transition exception here: an unowned legacy document may be read, but changing or
        // sharing it still requires someone to have said so.
        return IsOwner(document, caller)
            || document.Permissions.Any(permission =>
                permission.PermissionType == type && Matches(permission, caller));
    }

    private static bool IsOwner(Document document, DocumentAccessContext caller) =>
        document.OwnerUserId is { } owner && owner == caller.UserId;

    private static bool Matches(DocumentPermission permission, DocumentAccessContext caller) =>
        (permission.GrantedToUserId is { } user && user == caller.UserId)
        || (permission.GrantedToRoleId is { } role && caller.RoleIds.Contains(role));
}
