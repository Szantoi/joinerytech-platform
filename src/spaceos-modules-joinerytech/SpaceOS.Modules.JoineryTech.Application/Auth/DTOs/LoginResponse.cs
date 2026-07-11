namespace SpaceOS.Modules.JoineryTech.Application.Auth.DTOs;

/// <summary>
/// Login response containing JWT access token and refresh token.
/// OAuth 2.0 Authorization Code Flow compliant.
/// </summary>
public sealed record LoginResponse
{
    /// <summary>
    /// JWT access token (ES256 ECDSA P-256 signed, expires in 15 minutes).
    /// </summary>
    public required string AccessToken { get; init; }

    /// <summary>
    /// Refresh token (opaque string, expires in 7 days).
    /// </summary>
    public required string RefreshToken { get; init; }

    /// <summary>
    /// Token type (always "Bearer").
    /// </summary>
    public string TokenType { get; init; } = "Bearer";

    /// <summary>
    /// Access token expiry in seconds (900 = 15 minutes).
    /// </summary>
    public int ExpiresIn { get; init; } = 900;

    /// <summary>
    /// User information.
    /// </summary>
    public required UserInfo User { get; init; }
}

/// <summary>
/// User information included in login response.
/// </summary>
public sealed record UserInfo
{
    public required Guid Id { get; init; }
    public required Guid TenantId { get; init; }
    public required string Email { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public required List<string> Roles { get; init; }
    public required List<string> Permissions { get; init; }
}
