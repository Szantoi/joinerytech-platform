namespace SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

/// <summary>
/// Token response for refresh token endpoint.
/// Contains new access token (refresh token remains the same).
/// </summary>
public sealed record TokenResponse
{
    /// <summary>
    /// New JWT access token (ES256 ECDSA P-256 signed, expires in 15 minutes).
    /// </summary>
    public required string AccessToken { get; init; }

    /// <summary>
    /// Token type (always "Bearer").
    /// </summary>
    public string TokenType { get; init; } = "Bearer";

    /// <summary>
    /// Access token expiry in seconds (900 = 15 minutes).
    /// </summary>
    public int ExpiresIn { get; init; } = 900;
}
