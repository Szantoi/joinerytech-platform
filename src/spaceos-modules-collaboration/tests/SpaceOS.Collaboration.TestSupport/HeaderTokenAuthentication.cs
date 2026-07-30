using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Collaboration.TestSupport;

/// <summary>
/// Stands in for Keycloak in tests: turns request headers into the CLAIMS a real token carries.
/// </summary>
/// <remarks>
/// <para>
/// It deliberately produces the claim shapes the hosting package parses — <c>tid</c>, <c>sub</c>,
/// and the <c>spaceos_tenants</c> JSON array with <c>enabled_modules</c> — rather than
/// short-cutting to an already-resolved tenant. Tenant resolution and the module gate are part of
/// what the tests are there to measure, so they must actually run.
/// </para>
/// <para>
/// It lives in its own assembly because two test projects need it. The alternative — a copy in
/// each — is the kind of duplicate that drifts silently and then makes one suite prove something
/// the other does not.
/// </para>
/// </remarks>
public sealed class HeaderTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    /// <summary>The scheme name to register and to authenticate with.</summary>
    public const string SchemeName = "CollaborationTestScheme";

    /// <summary>Header naming the tenant the synthetic token belongs to.</summary>
    public const string TenantHeader = "X-Test-Tenant";

    /// <summary>Header naming the acting user.</summary>
    public const string UserHeader = "X-Test-User";

    /// <summary>Header listing the tenant's enabled modules (comma separated).</summary>
    public const string ModulesHeader = "X-Test-Modules";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(TenantHeader, out var tenant)
            || !Request.Headers.TryGetValue(UserHeader, out var user))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var modules = Request.Headers.TryGetValue(ModulesHeader, out var raw) && !string.IsNullOrWhiteSpace(raw)
            ? raw.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : [];

        var tenantList = JsonSerializer.Serialize(new[]
        {
            new Dictionary<string, object>
            {
                ["tenant_id"] = tenant.ToString(),
                ["enabled_modules"] = modules
            }
        });

        var identity = new ClaimsIdentity(
            [
                new Claim(TenancyDefaults.TenantIdClaim, tenant.ToString()),
                new Claim("sub", user.ToString()),
                new Claim(TenancyDefaults.TenantListClaim, tenantList, "JSON")
            ],
            SchemeName);

        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
