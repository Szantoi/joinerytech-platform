namespace SpaceOS.Modules.JoineryTech.Domain.Entities;

/// <summary>
/// Represents a user within a tenant organization.
/// Users are tenant-isolated and have role-based permissions.
/// </summary>
public class User
{
    /// <summary>
    /// Unique identifier for the user.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Tenant this user belongs to (multi-tenant isolation).
    /// </summary>
    public Guid TenantId { get; set; }

    /// <summary>
    /// User's email address (unique within tenant).
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt hashed password.
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// User's first name.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name.
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// User's assigned roles (JSONB stored as string array).
    /// Example: ["admin", "sales_lead"]
    /// </summary>
    public List<string> Roles { get; set; } = new();

    /// <summary>
    /// User's granted permissions (JSONB stored as string array).
    /// Example: ["catalog.read", "catalog.write"]
    /// </summary>
    public List<string> Permissions { get; set; } = new();

    /// <summary>
    /// Current status of the user account.
    /// </summary>
    public UserStatus Status { get; set; }

    /// <summary>
    /// Timestamp of the user's last successful login.
    /// </summary>
    public DateTimeOffset? LastLoginAt { get; set; }

    /// <summary>
    /// Timestamp when the user account was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Timestamp of last user record update.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    /// <summary>
    /// Checks if the user has a specific permission.
    /// </summary>
    public bool HasPermission(string permission) => Permissions.Contains(permission);

    /// <summary>
    /// Checks if the user has a specific role.
    /// </summary>
    public bool HasRole(string role) => Roles.Contains(role);
}

/// <summary>
/// User account status enumeration.
/// </summary>
public enum UserStatus
{
    /// <summary>User account is active and can log in.</summary>
    Active,

    /// <summary>User account is inactive (not yet activated or deactivated).</summary>
    Inactive,

    /// <summary>User account is suspended (policy violation, security).</summary>
    Suspended
}
