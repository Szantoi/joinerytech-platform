namespace SpaceOS.Modules.Hosting.Tenancy;

/// <summary>
/// Well-known claim types, header names and PostgreSQL session keys shared by every
/// JoineryTech module host (ADR-061 + ADR-062).
/// </summary>
/// <remarks>
/// The values mirror the kernel reference implementation
/// (<c>SpaceOS.Infrastructure/Persistence/TenantSessionInterceptor.cs</c>) so that the
/// module world and the kernel world stay interoperable — in particular
/// <see cref="PgSessionKey"/> is <c>app.current_tenant_id</c>, the single session key
/// mandated by ADR-062 (K1).
/// </remarks>
public static class TenancyDefaults
{
    /// <summary>Retired flat tenant selector. Its presence makes the canonical profile invalid.</summary>
    public const string TenantIdClaim = "tid";

    /// <summary>
    /// Keycloak claim carrying exactly one native tenant-authority entry.
    /// </summary>
    public const string TenantListClaim = "spaceos_tenants";

    /// <summary>
    /// Retired top-level module fallback. Its presence makes the canonical profile invalid.
    /// </summary>
    public const string EnabledModulesClaim = "enabled_modules";

    /// <summary>Retired flat tenant alias. Its presence makes the canonical profile invalid.</summary>
    public const string LegacyTenantIdClaim = "tenant_id";

    /// <summary>Retired top-level permission fallback.</summary>
    public const string PermissionsClaim = "permissions";

    /// <summary>Signed positive integer membership revision checked against online state.</summary>
    public const string MembershipVersionClaim = "spaceos_membership_version";

    /// <summary>Signed positive integer projection revision checked against online state.</summary>
    public const string ProjectionVersionClaim = "spaceos_projection_version";

    /// <summary>
    /// Tenant selection header used by the JoineryTech module clients. Per ADR-061 (T1) the
    /// header is NEVER trusted on its own — it is only accepted when it matches a tenant
    /// present in the caller's token.
    /// </summary>
    public const string TenantHeader = "X-Tenant-Id";

    /// <summary>Kernel-style tenant selection header, accepted as an alias of <see cref="TenantHeader"/>.</summary>
    public const string ActiveTenantHeader = "X-SpaceOS-Active-Tenant";

    /// <summary>
    /// <see cref="Microsoft.AspNetCore.Http.HttpContext.Items"/> key under which
    /// <see cref="TenantResolutionMiddleware"/> publishes the resolved tenant id (a <see cref="Guid"/>).
    /// </summary>
    public const string HttpContextItemKey = "SpaceOS.Tenancy.TenantId";

    /// <summary>
    /// PostgreSQL session variable read by every RLS policy. Single key across kernel and
    /// modules (ADR-062 decision K1).
    /// </summary>
    public const string PgSessionKey = "app.current_tenant_id";
}
