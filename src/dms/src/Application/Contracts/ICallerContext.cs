namespace SpaceOS.Modules.DMS.Application.Contracts;

/// <summary>
/// Who is making the request: the authenticated user and the roles they hold.
/// </summary>
/// <remarks>
/// <para>
/// Separate from <see cref="ITenantContext"/> on purpose. The tenant answers "whose data is
/// this" and is enforced by row-level security; the caller answers "who is asking", which RLS
/// cannot see. Document-level access control needs both, and conflating them would make the
/// second one look like it was already handled.
/// </para>
/// <para>
/// Reading either property without an authenticated caller is fail-loud, following the tenant
/// context's precedent (ADR-062): a silent empty identity would quietly deny — or, worse,
/// quietly match — instead of surfacing a misconfigured pipeline.
/// </para>
/// </remarks>
public interface ICallerContext
{
    /// <summary>The authenticated user's identifier.</summary>
    Guid UserId { get; }

    /// <summary>Roles the caller holds in the current tenant; may be empty, never null.</summary>
    IReadOnlySet<Guid> RoleIds { get; }
}
