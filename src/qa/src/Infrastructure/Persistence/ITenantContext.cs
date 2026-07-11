namespace SpaceOS.Modules.QA.Infrastructure.Persistence;

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
