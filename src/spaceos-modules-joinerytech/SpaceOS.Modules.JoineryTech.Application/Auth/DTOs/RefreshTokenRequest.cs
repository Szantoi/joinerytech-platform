namespace SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

/// <summary>
/// Refresh token request for obtaining a new access token.
/// </summary>
public sealed record RefreshTokenRequest
{
    /// <summary>
    /// Refresh token obtained from login or previous refresh.
    /// </summary>
    public required string RefreshToken { get; init; }

    /// <summary>
    /// Optional device fingerprint for security validation.
    /// </summary>
    public string? DeviceFingerprint { get; init; }
}
