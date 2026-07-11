namespace SpaceOS.Modules.Maintenance.Infrastructure.Persistence;

/// <summary>
/// Service for accessing the current tenant context.
/// Used by TenantDbConnectionInterceptor to set PostgreSQL session variables for RLS.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Gets the current tenant ID from the request context (e.g., JWT claims, HttpContext).
    /// </summary>
    Guid TenantId { get; }
}
