namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// The single, island-wide tenant context abstraction (ADR-061). Implementations resolve
/// the current tenant from the authenticated request (<see cref="ClaimsTenantContext"/>)
/// or provide a fixed value for tests and background work (<see cref="FixedTenantContext"/>).
/// </summary>
/// <remarks>
/// Module-local <c>ITenantContext</c> interfaces (four namespaces before ADR-061) are adapted
/// onto this contract so a single resolution path exists per process. The header-only
/// <c>HttpTenantContext</c> copies are removed — the tenant is derived from the JWT.
/// </remarks>
public interface ITenantContext
{
    /// <summary>Whether a tenant has been resolved for the current scope.</summary>
    bool HasTenant { get; }

    /// <summary>
    /// The resolved tenant id.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// No tenant is resolved in the current scope. This is deliberately fail-loud (ADR-062):
    /// callers must never observe an empty/forged tenant silently.
    /// </exception>
    Guid TenantId { get; }
}
