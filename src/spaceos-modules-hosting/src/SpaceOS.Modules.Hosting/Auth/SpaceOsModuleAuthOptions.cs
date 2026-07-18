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

    /// <summary>Identity issued by the Development scheme (Development mode only).</summary>
    public DevelopmentIdentityOptions Development { get; set; } = new();
}

/// <summary>
/// The synthetic identity issued by <see cref="DevelopmentAuthenticationHandler"/> —
/// config-driven so local runs exercise the exact same tenancy pipeline as production
/// (the dev principal carries a real <c>tid</c> claim).
/// </summary>
public sealed class DevelopmentIdentityOptions
{
    /// <summary>Tenant id placed into the <c>tid</c> claim. Required in Development mode.</summary>
    public Guid? TenantId { get; set; }

    /// <summary>Subject (<c>sub</c> / NameIdentifier) of the synthetic principal.</summary>
    public string UserId { get; set; } = "development-user";

    /// <summary>Display name (<c>preferred_username</c>) of the synthetic principal.</summary>
    public string UserName { get; set; } = "dev@local";

    /// <summary>Role claims granted to the synthetic principal.</summary>
    public string[] Roles { get; set; } = [];
}
