using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Who is asking: the caller's identity and the roles they hold.
/// </summary>
/// <param name="UserId">The authenticated user.</param>
/// <param name="RoleIds">
/// Roles the user holds in this tenant. A permission may be granted to a role rather than to a
/// person, so evaluating only the person would silently deny access that was in fact granted.
/// </param>
public sealed record DocumentAccessContext(UserId UserId, IReadOnlySet<Guid> RoleIds)
{
    /// <summary>A caller with no roles — the common case for a direct user grant.</summary>
    public DocumentAccessContext(UserId userId)
        : this(userId, new HashSet<Guid>())
    {
    }
}

/// <summary>
/// Decides what a caller may do with one document, INSIDE a tenant.
/// </summary>
/// <remarks>
/// <para>
/// This is the second gate, not the first. Row-level security already keeps tenants apart; what
/// this adds is the question RLS cannot answer — may this particular colleague open this
/// particular document. Until it was implemented, the answer inside a tenant was always "yes".
/// </para>
/// <para>
/// <b>Fail-closed</b> (business owner decision, 2026-07-29): access is granted, never assumed.
/// The owner has full control; everyone else needs an explicit grant, directly or through a role.
/// </para>
/// <para>
/// <b>The one deliberate exception</b> is documents created before ownership was recorded
/// (<see cref="Document.OwnerUserId"/> is null). Those may be READ inside the tenant, but not
/// edited, deleted or shared without a grant. Denying them outright would make every existing
/// document vanish for everyone the moment this ships — and a rule that loses people their files
/// is a rule that gets switched off. A documented transition, not the target state.
/// </para>
/// </remarks>
public interface IDocumentAccessControlService
{
    /// <summary>May the caller open the document?</summary>
    bool CanView(Document document, DocumentAccessContext caller);

    /// <summary>May the caller change it or add a version?</summary>
    bool CanEdit(Document document, DocumentAccessContext caller);

    /// <summary>May the caller delete it?</summary>
    bool CanDelete(Document document, DocumentAccessContext caller);

    /// <summary>May the caller grant access to others?</summary>
    bool CanShare(Document document, DocumentAccessContext caller);
}
