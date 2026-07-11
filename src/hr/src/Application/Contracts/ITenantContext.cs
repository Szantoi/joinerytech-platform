namespace SpaceOS.Modules.HR.Application.Contracts;

/// <summary>
/// Provides access to the current tenant context for multi-tenancy support.
/// Injected via DI into TenantDbConnectionInterceptor for RLS session context setting.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Gets the current tenant ID.
    /// </summary>
    Guid TenantId { get; }
}
