using System.Security.Claims;

namespace SpaceOS.Modules.Hosting.Auth;

/// <summary>
/// Resolves the immutable caller identity from an authenticated JWT principal.
/// </summary>
/// <remarks>
/// Audit fields must never be sourced from request headers or bodies: those
/// values are controlled by the caller and can impersonate another user. Both
/// raw <c>sub</c> and the framework-mapped name identifier are supported.
/// </remarks>
public static class ClaimsPrincipalUserIdExtensions
{
    private static readonly string[] UserIdClaimTypes = ["sub", ClaimTypes.NameIdentifier];

    /// <summary>
    /// Gets the caller's GUID identifier or fails closed when the token cannot
    /// support a trustworthy audit record.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// The authenticated principal does not carry a usable GUID user id.
    /// </exception>
    public static Guid GetRequiredUserId(this ClaimsPrincipal principal)
    {
        ArgumentNullException.ThrowIfNull(principal);

        foreach (var claimType in UserIdClaimTypes)
        {
            if (Guid.TryParse(principal.FindFirstValue(claimType), out var userId))
            {
                return userId;
            }
        }

        throw new InvalidOperationException(
            "The authenticated principal carries no usable user identifier ('sub' or nameidentifier as a GUID).");
    }
}
