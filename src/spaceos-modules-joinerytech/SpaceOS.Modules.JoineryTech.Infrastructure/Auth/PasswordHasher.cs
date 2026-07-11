using Microsoft.Extensions.Logging;
using SpaceOS.Modules.JoineryTech.Application.Contracts;

namespace SpaceOS.Modules.JoineryTech.Infrastructure.Auth;

/// <summary>
/// BCrypt password hasher with work factor 11.
/// BCrypt automatically handles salt generation and storage in the hash string.
/// </summary>
public sealed class PasswordHasher : IPasswordHasher
{
    private readonly ILogger<PasswordHasher> _logger;
    private const int WorkFactor = 11; // 2^11 = 2048 rounds (good balance of security and performance)

    public PasswordHasher(ILogger<PasswordHasher> logger)
    {
        _logger = logger;
    }

    public string HashPassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Password cannot be null or whitespace", nameof(password));
        }

        var hash = BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);
        _logger.LogDebug("Password hashed successfully (work factor: {WorkFactor})", WorkFactor);

        return hash;
    }

    public bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ArgumentException("Password cannot be null or whitespace", nameof(password));
        }

        if (string.IsNullOrWhiteSpace(hash))
        {
            throw new ArgumentException("Hash cannot be null or whitespace", nameof(hash));
        }

        try
        {
            var isValid = BCrypt.Net.BCrypt.Verify(password, hash);
            _logger.LogDebug("Password verification result: {IsValid}", isValid);
            return isValid;
        }
        catch (BCrypt.Net.SaltParseException ex)
        {
            _logger.LogWarning("Invalid BCrypt hash format: {Message}", ex.Message);
            return false;
        }
    }
}
