namespace SpaceOS.Modules.Ehs.Infrastructure.Data;

/// <summary>
/// Interface for accessing current tenant context.
/// </summary>
public interface ITenantContext
{
    /// <summary>
    /// Gets the current tenant ID.
    /// </summary>
    Guid TenantId { get; }
}
