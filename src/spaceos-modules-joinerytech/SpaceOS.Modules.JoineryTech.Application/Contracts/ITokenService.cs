using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Application.Contracts;

/// <summary>
/// Service for JWT token generation and validation.
/// Uses ES256 (ECDSA P-256) asymmetric signing algorithm.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a new JWT access token for the user.
    /// Token contains claims: sub (userId), tenant_id, email, roles, permissions.
    /// Expires in 15 minutes.
    /// </summary>
    /// <param name="user">User entity with roles and permissions.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Signed JWT access token (ES256).</returns>
    Task<string> GenerateAccessTokenAsync(User user, CancellationToken ct = default);

    /// <summary>
    /// Generates a new cryptographically secure refresh token.
    /// Token is opaque (not a JWT), stored as hash in database.
    /// Expires in 7 days.
    /// </summary>
    /// <returns>Secure random refresh token string.</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Hashes a refresh token for secure storage.
    /// Uses SHA-256 hashing (not BCrypt, as tokens are high-entropy).
    /// </summary>
    /// <param name="token">Plain refresh token.</param>
    /// <returns>SHA-256 hash of the token.</returns>
    string HashRefreshToken(string token);

    /// <summary>
    /// Validates a JWT access token and extracts claims.
    /// Verifies signature, expiry, and issuer.
    /// </summary>
    /// <param name="token">JWT access token to validate.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>ClaimsPrincipal if valid, null if invalid.</returns>
    Task<System.Security.Claims.ClaimsPrincipal?> ValidateAccessTokenAsync(
        string token,
        CancellationToken ct = default);
}
