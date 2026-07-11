namespace SpaceOS.Modules.JoineryTech.Domain.Entities;

/// <summary>
/// Represents a JWT refresh token for multi-device session management.
/// Allows users to obtain new access tokens without re-authentication.
/// </summary>
public class RefreshToken
{
    /// <summary>
    /// Unique identifier for the refresh token.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// User this refresh token belongs to.
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Hashed token value (SHA-256) for secure storage.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// Device name for identification (e.g., "iPhone 15 Pro", "Chrome on MacBook").
    /// </summary>
    public string? DeviceName { get; set; }

    /// <summary>
    /// Device fingerprint for security (User-Agent hash, IP hash, etc.).
    /// </summary>
    public string? DeviceFingerprint { get; set; }

    /// <summary>
    /// Expiration timestamp for the refresh token.
    /// </summary>
    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>
    /// Timestamp when the token was revoked (null if still active).
    /// </summary>
    public DateTimeOffset? RevokedAt { get; set; }

    /// <summary>
    /// Timestamp when the refresh token was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    /// <summary>
    /// Checks if the refresh token is still valid (not expired, not revoked).
    /// </summary>
    public bool IsValid()
    {
        return RevokedAt == null && ExpiresAt > DateTimeOffset.UtcNow;
    }

    /// <summary>
    /// Revokes the refresh token immediately.
    /// </summary>
    public void Revoke()
    {
        RevokedAt = DateTimeOffset.UtcNow;
    }
}
