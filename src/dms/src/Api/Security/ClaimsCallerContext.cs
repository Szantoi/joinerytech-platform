using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SpaceOS.Modules.DMS.Application.Contracts;

namespace SpaceOS.Modules.DMS.Api.Security;

/// <summary>
/// Resolves the caller from the authenticated principal (ADR-061: identity comes from the JWT).
/// </summary>
/// <remarks>
/// <para>
/// Several claim names are accepted for each value, because the name depends on who issued the
/// token and whether the host maps inbound claims: <c>sub</c> survives unmapped, while the
/// default JWT handler rewrites it to <see cref="ClaimTypes.NameIdentifier"/>. Accepting both is
/// not sloppiness — pinning one name would make access control silently deny everything the day
/// a host toggles claim mapping.
/// </para>
/// <para>
/// Role claims that are not GUIDs are ignored rather than rejected: a realm may carry
/// human-readable roles ("dms-admin") alongside the identifiers this module grants against, and
/// a token with both must not fail outright.
/// </para>
/// </remarks>
public sealed class ClaimsCallerContext : ICallerContext
{
    private static readonly string[] UserIdClaims = ["sub", ClaimTypes.NameIdentifier];
    private static readonly string[] RoleClaims = ["roles", "role", ClaimTypes.Role];

    private readonly IHttpContextAccessor _httpContextAccessor;

    /// <summary>Creates the context over the current HTTP request.</summary>
    public ClaimsCallerContext(IHttpContextAccessor httpContextAccessor)
    {
        ArgumentNullException.ThrowIfNull(httpContextAccessor);
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    /// <exception cref="InvalidOperationException">
    /// No authenticated caller, or the identifier is not a GUID. Fail-loud: an access decision
    /// made on an empty identity is worse than a failed request.
    /// </exception>
    public Guid UserId
    {
        get
        {
            var principal = _httpContextAccessor.HttpContext?.User
                ?? throw new InvalidOperationException(
                    "No HTTP context: the caller identity cannot be resolved outside a request.");

            foreach (var claimType in UserIdClaims)
            {
                var value = principal.FindFirstValue(claimType);
                if (Guid.TryParse(value, out var userId))
                {
                    return userId;
                }
            }

            throw new InvalidOperationException(
                "The authenticated principal carries no usable user identifier ('sub' or " +
                "nameidentifier as a GUID). Document access cannot be decided without it.");
        }
    }

    /// <inheritdoc />
    public IReadOnlySet<Guid> RoleIds
    {
        get
        {
            var principal = _httpContextAccessor.HttpContext?.User;
            if (principal is null)
            {
                return new HashSet<Guid>();
            }

            var roles = new HashSet<Guid>();
            foreach (var claim in principal.Claims.Where(claim => RoleClaims.Contains(claim.Type, StringComparer.Ordinal)))
            {
                if (Guid.TryParse(claim.Value, out var roleId))
                {
                    roles.Add(roleId);
                }
            }

            return roles;
        }
    }
}
