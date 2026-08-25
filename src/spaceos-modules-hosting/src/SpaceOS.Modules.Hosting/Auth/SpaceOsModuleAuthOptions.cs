namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Configuration of the shared module-host authentication (bound from the <c>Jwt</c>
/// section, ADR-061). Validation is fail-fast at registration time: a misconfigured host
/// refuses to start instead of serving unauthenticated traffic.
/// </summary>
public sealed class SpaceOsModuleAuthOptions
{
    /// <summary>Configuration section name (<c>Jwt</c> — kernel/HR precedent).</summary>
    public const string SectionName = "Jwt";

    /// <summary><see cref="Mode"/> value for real Keycloak JWT bearer validation (default).</summary>
    public const string KeycloakMode = "Keycloak";

    /// <summary><see cref="Mode"/> value for the local-development-only permissive scheme.</summary>
    public const string DevelopmentMode = "Development";

    /// <summary>
    /// Authentication mode: <see cref="KeycloakMode"/> (default) or <see cref="DevelopmentMode"/>.
    /// Development mode refuses to start outside the Development environment.
    /// </summary>
    public string Mode { get; set; } = KeycloakMode;

    /// <summary>
    /// Keycloak realm authority, e.g. <c>https://joinerytech.hu/auth/realms/spaceos</c>.
    /// One authority for the whole platform (ADR-061 — the <c>auth.spaceos.local</c> drift
    /// is retired). Required in Keycloak mode.
    /// </summary>
    public string? Authority { get; set; }

    /// <summary>Expected audience, one per module (e.g. <c>ehs-api</c>). Required in Keycloak mode.</summary>
    public string? Audience { get; set; }

    /// <summary>
    /// Exact OIDC <c>azp</c> accepted by this host (for example <c>portal-app</c>).
    /// Required in Keycloak mode; partial names and wildcard client identities are forbidden.
    /// </summary>
    public string? AuthorizedParty { get; set; }

    /// <summary>
    /// Exact JOSE <c>typ</c> header emitted by the configured Keycloak realm.
    /// Keycloak 24 uses <c>JWT</c>; an RFC 9068 deployment may explicitly use <c>at+jwt</c>.
    /// This is a header value, never a payload claim.
    /// </summary>
    public string TokenType { get; set; } = "JWT";

    /// <summary>
    /// Exact Keycloak access-token <c>typ</c> payload claim, independent of JOSE
    /// <see cref="TokenType"/>. Keycloak access tokens use <c>Bearer</c>.
    /// </summary>
    public string AccessTokenPayloadType { get; set; } = "Bearer";

    /// <summary>Bounded discovery/JWKS transport, refresh and freshness policy.</summary>
    public OidcAuthoritySecurityOptions OidcAuthority { get; set; } = new();

    /// <summary>Identity issued by the Development scheme (Development mode only).</summary>
    public DevelopmentIdentityOptions Development { get; set; } = new();
}

/// <summary>Security bounds for the real OIDC discovery/JWKS configuration manager.</summary>
public sealed class OidcAuthoritySecurityOptions
{
    /// <summary>Total HTTP timeout for one discovery or JWKS request.</summary>
    public int BackchannelTimeoutMilliseconds { get; set; } = 1500;

    /// <summary>Minimum interval between explicit refresh attempts.</summary>
    public int RefreshIntervalSeconds { get; set; } = 30;

    /// <summary>Automatic metadata/JWKS refresh interval.</summary>
    public int AutomaticRefreshIntervalMinutes { get; set; } = 5;

    /// <summary>Maximum trusted age of the last full parsed network configuration.</summary>
    public int MaximumConfigurationAgeSeconds { get; set; } = 600;

    /// <summary>Maximum discovery or JWKS response body.</summary>
    public int MaximumDocumentBytes { get; set; } = 64 * 1024;

    /// <summary>Maximum number of usable signing keys in one JWKS response.</summary>
    public int MaximumSigningKeys { get; set; } = 16;
}

/// <summary>
/// The synthetic identity issued by <see cref="DevelopmentAuthenticationHandler"/> —
/// config-driven so local runs exercise the exact same tenancy pipeline as production
/// (the dev principal carries the same native selected-tenant projection).
/// </summary>
public sealed class DevelopmentIdentityOptions
{
    /// <summary>Tenant id placed into the native <c>spaceos_tenants[].tenant_id</c> projection. Required in Development mode.</summary>
    public Guid? TenantId { get; set; }

    /// <summary>Subject (<c>sub</c> / NameIdentifier) of the synthetic principal.</summary>
    public string UserId { get; set; } = "development-user";

    /// <summary>Display name (<c>preferred_username</c>) of the synthetic principal.</summary>
    public string UserName { get; set; } = "dev@local";

    /// <summary>Role claims granted to the synthetic principal.</summary>
    public string[] Roles { get; set; } = [];

    /// <summary>
    /// Canonical module identifiers granted to the synthetic principal. This is only
    /// interpreted by <c>Jwt:Mode=Development</c>; an empty list deliberately grants
    /// no modules so module policies remain fail-closed during local development.
    /// </summary>
    public string[] EnabledModules { get; set; } = [];
}
