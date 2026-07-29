using System.Linq.Expressions;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// The visibility rule as a QUERY, so the database can apply it.
/// </summary>
/// <remarks>
/// <para>
/// <see cref="DocumentAccessControlService.CanView"/> answers the question for one document
/// already in memory. A list cannot work that way: filtering after the fact breaks paging (the
/// database counts rows the caller may not see, so pages come back short and inconsistent), and
/// it drags every row of the tenant into memory first. The same rule therefore has to exist in
/// a form the query provider can translate.
/// </para>
/// <para>
/// <b>Two forms of one rule is exactly the drift risk this module has been paying for
/// elsewhere</b>, so it is not left to trust: <c>DocumentAccessRuleParityTests</c> runs both
/// against the same cases and fails if they ever disagree.
/// </para>
/// </remarks>
public static class DocumentAccessSpecification
{
    /// <summary>Documents the caller may see, as a translatable predicate.</summary>
    public static Expression<Func<Document, bool>> Visible(DocumentAccessContext caller)
    {
        ArgumentNullException.ThrowIfNull(caller);

        var userId = caller.UserId;

        // A List rather than the set: EF translates Contains over a list into an IN clause,
        // and the closure has to capture something it can inline into SQL.
        var roleIds = caller.RoleIds.ToList();

        return document =>

            // Documents that pre-date ownership stay readable inside the tenant — the same
            // documented transition the in-memory rule applies.
            document.OwnerUserId == null
            || document.OwnerUserId == userId
            || document.Permissions.Any(permission =>
                permission.GrantedToUserId == userId
                || (permission.GrantedToRoleId != null && roleIds.Contains(permission.GrantedToRoleId.Value)));
    }
}
