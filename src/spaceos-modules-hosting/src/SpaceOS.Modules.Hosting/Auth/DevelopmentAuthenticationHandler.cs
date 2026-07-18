using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SpaceOS.Modules.Hosting.Tenancy;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// An authentication scheme for LOCAL DEVELOPMENT ONLY that authenticates every caller
/// with a config-driven synthetic identity (lifted from the kontrolling host per ADR-061,
/// extended with a real <c>tid</c> claim so the tenancy pipeline works unchanged).
/// </summary>
/// <remarks>
/// SAFETY: registration (<see cref="SpaceOsModuleAuthExtensions.AddSpaceOsModuleAuth"/>)
/// throws unless the host runs in the Development environment — a scheme that
/// authenticates everyone must never start anywhere else.
/// </remarks>
public sealed class DevelopmentAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    /// <summary>Name of the development scheme.</summary>
    public const string SchemeName = "Development";

    private readonly SpaceOsModuleAuthOptions _authOptions;

    /// <summary>Creates the handler.</summary>
    /// <param name="options">Scheme options monitor (framework-required).</param>
    /// <param name="logger">Logger factory (framework-required).</param>
    /// <param name="encoder">URL encoder (framework-required).</param>
    /// <param name="authOptions">The bound <c>Jwt</c> options carrying the synthetic identity.</param>
    public DevelopmentAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IOptions<SpaceOsModuleAuthOptions> authOptions)
        : base(options, logger, encoder)
    {
        ArgumentNullException.ThrowIfNull(authOptions);
        _authOptions = authOptions.Value;
    }

    /// <inheritdoc />
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var identityOptions = _authOptions.Development;

        // Registration already fail-fasted on a missing TenantId; this guards direct misuse.
        var tenantId = identityOptions.TenantId
            ?? throw new InvalidOperationException(
                "Jwt:Development:TenantId is not configured — the Development scheme cannot issue a tenant-less identity.");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, identityOptions.UserId),
            new("sub", identityOptions.UserId),
            new("preferred_username", identityOptions.UserName),
            new(TenancyDefaults.TenantIdClaim, tenantId.ToString()),
        };
        claims.AddRange(identityOptions.Roles.Select(static role => new Claim(ClaimTypes.Role, role)));

        var identity = new ClaimsIdentity(claims, SchemeName);
        return Task.FromResult(AuthenticateResult.Success(
            new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
    }
}
