namespace SpaceOS.Modules.JoineryTech.Application.Contracts;

/// <summary>
/// Service for password hashing and verification using BCrypt.
/// BCrypt automatically handles salt generation and storage.
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// Hashes a plain password using BCrypt (work factor: 11).
    /// Returns a BCrypt hash string that includes salt.
    /// </summary>
    /// <param name="password">Plain password to hash.</param>
    /// <returns>BCrypt hash (60 characters).</returns>
    string HashPassword(string password);

    /// <summary>
    /// Verifies a plain password against a BCrypt hash.
    /// Timing-attack resistant comparison.
    /// </summary>
    /// <param name="password">Plain password to verify.</param>
    /// <param name="hash">BCrypt hash from database.</param>
    /// <returns>True if password matches, false otherwise.</returns>
    bool VerifyPassword(string password, string hash);
}
