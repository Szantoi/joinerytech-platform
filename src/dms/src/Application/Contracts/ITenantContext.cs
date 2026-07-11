namespace SpaceOS.Modules.DMS.Application.Contracts;

/// <summary>
/// Tenant context interface for multi-tenancy RLS support.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Current tenant ID from the HTTP context or service context.
    /// </summary>
    Guid TenantId { get; }
}
