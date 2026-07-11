namespace SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

/// <summary>
/// Login request with email and password credentials.
/// </summary>
public sealed record LoginRequest
{
    /// <summary>
    /// User email address (unique per tenant).
    /// </summary>
    public required string Email { get; init; }

    /// <summary>
    /// User password (will be verified against BCrypt hash).
    /// </summary>
    public required string Password { get; init; }

    /// <summary>
    /// Optional device name for refresh token tracking.
    /// </summary>
    public string? DeviceName { get; init; }

    /// <summary>
    /// Optional device fingerprint for security tracking.
    /// </summary>
    public string? DeviceFingerprint { get; init; }
}
