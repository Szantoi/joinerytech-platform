namespace SpaceOS.Projects.Application.Tenancy;

/// <summary>
/// The tenant the current unit of work belongs to.
/// </summary>
/// <remarks>
/// <para>
/// A one-property port rather than a direct dependency on the hosting package's
/// <c>ITenantContext</c>, for the ordinary reason: the application layer should be runnable —
/// and testable — without ASP.NET Core in the build graph. Infrastructure adapts the platform
/// type onto this one.
/// </para>
/// <para>
/// <b>It has no "no tenant" state.</b> The hosting package's version does
/// (<c>HasTenant</c>), because an interceptor genuinely runs on connections that belong to nobody
/// — startup migrations, health pings. A command handler never legitimately does. Making the
/// absence unrepresentable here means the failure surfaces where it can be understood, instead of
/// as a write that lands under <c>Guid.Empty</c>.
/// </para>
/// </remarks>
public interface ICurrentTenant
{
    /// <summary>The calling tenant.</summary>
    /// <exception cref="InvalidOperationException">No tenant is in scope.</exception>
    Guid TenantId { get; }
}
