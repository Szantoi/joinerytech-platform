namespace SpaceOS.Modules.JoineryTech.Domain.Entities;

/// <summary>
/// Represents a tenant (customer organization) in the multi-tenant system.
/// Each tenant has isolated data via Row-Level Security (RLS).
/// </summary>
public class Tenant
{
    /// <summary>
    /// Unique identifier for the tenant.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the tenant organization.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// URL-friendly identifier (e.g., "acme-corp" for subdomain routing).
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Current status of the tenant account.
    /// </summary>
    public TenantStatus Status { get; set; }

    /// <summary>
    /// Subscription/account type determining feature access.
    /// </summary>
    public AccountType AccountType { get; set; }

    /// <summary>
    /// Timestamp when the tenant was created.
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// Timestamp of last tenant record update.
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
}

/// <summary>
/// Tenant account status enumeration.
/// </summary>
public enum TenantStatus
{
    /// <summary>Tenant is active and operational.</summary>
    Active,

    /// <summary>Tenant account is suspended (billing issue, policy violation).</summary>
    Suspended,

    /// <summary>Tenant is in trial period.</summary>
    Trial
}

/// <summary>
/// Tenant subscription/account type.
/// </summary>
public enum AccountType
{
    /// <summary>Free tier with limited features.</summary>
    Free,

    /// <summary>Premium tier with full feature access.</summary>
    Premium,

    /// <summary>Enterprise tier with advanced features and SLA.</summary>
    Enterprise
}
