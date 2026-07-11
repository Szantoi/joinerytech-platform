namespace SpaceOS.Modules.Kontrolling.Infrastructure.MultiTenancy;

/// <summary>
/// Tenant context abstraction for RLS session variables.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Get current tenant ID (from HttpContext or JWT claims).
    /// </summary>
    Guid GetCurrentTenantId();
}
