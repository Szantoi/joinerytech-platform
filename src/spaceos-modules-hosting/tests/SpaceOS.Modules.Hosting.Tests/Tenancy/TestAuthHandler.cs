using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Tests.Tenancy;

/// <summary>
/// Header-driven test authentication scheme: the test request declares the claims the
/// "token" should carry, so one TestServer host covers every tenancy scenario.
/// </summary>
/// <remarks>
/// <list type="bullet">
/// <item><description><c>X-Test-Tid: guid</c> → one native <c>spaceos_tenants</c> entry.</description></item>
/// <item><description><c>X-Test-Tenants: a,b</c> → a deliberately invalid multi-entry authority.</description></item>
/// <item><description><c>X-Test-Enabled-Modules</c> augments the native entry.</description></item>
/// <item><description><c>X-Test-Permissions</c> overrides the default per-module view permissions.</description></item>
/// <item><description><c>X-Test-Authenticated: 1</c> → authenticated principal without any tenant claim.</description></item>
/// <item><description>No test header → unauthenticated (NoResult).</description></item>
/// </list>
/// </remarks>
internal sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new List<Claim> { new("sub", "test-subject") };
        var declared = false;

        var tenantIds = Request.Headers.TryGetValue("X-Test-Tenants", out var tenantList)
            ? tenantList.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            : Request.Headers.TryGetValue("X-Test-Tid", out var tid)
                ? [tid.ToString()]
                : [];
        var modules = Array.Empty<string>();
        if (Request.Headers.TryGetValue("X-Test-Enabled-Modules", out var enabledModules))
        {
            modules = enabledModules.ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            declared = true;
        }

        if (tenantIds.Length > 0)
        {
            var sortedModules = modules.Order(StringComparer.Ordinal).ToArray();
            var permissions = Request.Headers.TryGetValue("X-Test-Permissions", out var declaredPermissions)
                ? declaredPermissions.ToString()
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Order(StringComparer.Ordinal)
                    .ToArray()
                : sortedModules.Select(module => $"{module}.view").ToArray();
            var entries = tenantIds.Select(id => new
            {
                tenant_id = id,
                permissions,
                enabled_modules = sortedModules,
            });
            claims.Add(new Claim(TenancyDefaults.TenantListClaim, JsonSerializer.Serialize(entries)));
            declared = true;
        }

        if (!declared && !Request.Headers.ContainsKey("X-Test-Authenticated"))
            return Task.FromResult(AuthenticateResult.NoResult());

        var identity = new ClaimsIdentity(claims, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
