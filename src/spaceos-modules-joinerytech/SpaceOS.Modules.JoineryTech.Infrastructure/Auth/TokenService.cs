using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SpaceOS.Modules.JoineryTech.Application.Contracts;
using SpaceOS.Modules.JoineryTech.Domain.Entities;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Auth;

/// <summary>
/// JWT token service using ES256 (ECDSA P-256) asymmetric signing.
/// Access tokens expire in 15 minutes.
/// Refresh tokens are cryptographically secure random strings (not JWTs).
/// </summary>
public sealed class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<TokenService> _logger;
    private readonly ECDsa _ecdsa;
    private readonly SigningCredentials _signingCredentials;

    public TokenService(IConfiguration configuration, ILogger<TokenService> logger)
    {
        _configuration = configuration;
        _logger = logger;

        // Initialize ECDSA P-256 key
        _ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);

        // TODO: In production, load private key from secure storage (Azure Key Vault, AWS KMS, etc.)
        // For now, generate ephemeral key (tokens won't survive service restart)
        _logger.LogWarning("Using ephemeral ECDSA key - tokens will be invalidated on service restart");

        _signingCredentials = new SigningCredentials(
            new ECDsaSecurityKey(_ecdsa),
            SecurityAlgorithms.EcdsaSha256);
    }

    public Task<string> GenerateAccessTokenAsync(User user, CancellationToken ct = default)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("tenant_id", user.TenantId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // Add roles as multiple claims
        foreach (var role in user.Roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        // Add permissions as custom claims
        foreach (var permission in user.Permissions)
        {
            claims.Add(new Claim("permission", permission));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(15),
            Issuer = _configuration["Jwt:Issuer"] ?? "joinerytech-api",
            Audience = _configuration["Jwt:Audience"] ?? "joinerytech-client",
            SigningCredentials = _signingCredentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var accessToken = tokenHandler.WriteToken(token);

        _logger.LogDebug("Generated access token for user {UserId} (expires in 15 minutes)", user.Id);

        return Task.FromResult(accessToken);
    }

    public string GenerateRefreshToken()
    {
        // Generate cryptographically secure random token (32 bytes = 256 bits)
        var randomBytes = RandomNumberGenerator.GetBytes(32);
        var refreshToken = Convert.ToBase64String(randomBytes);

        _logger.LogDebug("Generated refresh token (length: {Length})", refreshToken.Length);

        return refreshToken;
    }

    public string HashRefreshToken(string token)
    {
        // Use SHA-256 for hashing (fast, deterministic, suitable for high-entropy tokens)
        // Note: BCrypt is overkill for high-entropy tokens; it's designed for low-entropy passwords
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = SHA256.HashData(bytes);
        var hashString = Convert.ToBase64String(hash);

        return hashString;
    }

    public Task<ClaimsPrincipal?> ValidateAccessTokenAsync(string token, CancellationToken ct = default)
    {
        var tokenHandler = new JwtSecurityTokenHandler();

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new ECDsaSecurityKey(_ecdsa),
            ValidateIssuer = true,
            ValidIssuer = _configuration["Jwt:Issuer"] ?? "joinerytech-api",
            ValidateAudience = true,
            ValidAudience = _configuration["Jwt:Audience"] ?? "joinerytech-client",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero // No tolerance for expired tokens
        };

        try
        {
            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);

            // Verify algorithm (prevent algorithm substitution attacks)
            if (validatedToken is not JwtSecurityToken jwtToken
                || !jwtToken.Header.Alg.Equals(SecurityAlgorithms.EcdsaSha256, StringComparison.InvariantCultureIgnoreCase))
            {
                _logger.LogWarning("Token validation failed: invalid algorithm");
                return Task.FromResult<ClaimsPrincipal?>(null);
            }

            _logger.LogDebug("Access token validated successfully");
            return Task.FromResult<ClaimsPrincipal?>(principal);
        }
        catch (SecurityTokenExpiredException ex)
        {
            _logger.LogDebug("Access token expired: {Message}", ex.Message);
            return Task.FromResult<ClaimsPrincipal?>(null);
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning("Token validation failed: {Message}", ex.Message);
            return Task.FromResult<ClaimsPrincipal?>(null);
        }
    }

    public void Dispose()
    {
        _ecdsa.Dispose();
    }
}
