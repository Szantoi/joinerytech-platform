using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Service for checking document access permissions.
/// </summary>
public interface IDocumentAccessControlService
{
    /// <summary>
    /// Checks if a user has a specific permission on a document.
    /// </summary>
    /// <param name="document">The document to check</param>
    /// <param name="userId">User requesting access</param>
    /// <param name="permissionType">Type of permission needed</param>
    /// <returns>True if user has permission, false otherwise</returns>
    Task<bool> HasPermissionAsync(
        Document document,
        UserId userId,
        PermissionType permissionType,
        CancellationToken ct = default);

    /// <summary>
    /// Gets all permissions a user has on a document.
    /// </summary>
    Task<IEnumerable<PermissionType>> GetUserPermissionsAsync(
        Document document,
        UserId userId,
        CancellationToken ct = default);
}
