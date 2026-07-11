namespace Ehs.Application.Services;

/// <summary>
/// Service to retrieve current user context from authentication.
/// Critical for RLS (Row-Level Security) implementation - v3-C1 security fix.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// Gets the current organization ID from the authenticated user's claims.
    /// </summary>
    /// <returns>Organization ID, or null if not authenticated</returns>
    Guid? GetOrganizationId();

    /// <summary>
    /// Gets the current user ID from the authenticated user's claims.
    /// </summary>
    /// <returns>User ID, or null if not authenticated</returns>
    string? GetUserId();

    /// <summary>
    /// Gets the current user's email from the authenticated user's claims.
    /// </summary>
    /// <returns>User email, or null if not authenticated</returns>
    string? GetUserEmail();

    /// <summary>
    /// Checks if the current user is authenticated.
    /// </summary>
    bool IsAuthenticated { get; }
}
