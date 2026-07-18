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
/// <item><description><c>X-Test-Tid: guid</c> → flat <c>tid</c> claim.</description></item>
/// <item><description><c>X-Test-Tenants: a,b</c> → <c>spaceos_tenants</c> JSON array claim.</description></item>
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

        if (Request.Headers.TryGetValue("X-Test-Tid", out var tid))
        {
            claims.Add(new Claim(TenancyDefaults.TenantIdClaim, tid.ToString()));
            declared = true;
        }

        if (Request.Headers.TryGetValue("X-Test-Tenants", out var tenantList))
        {
            var entries = tenantList.ToString()
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(static id => new { tenantId = id });
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
