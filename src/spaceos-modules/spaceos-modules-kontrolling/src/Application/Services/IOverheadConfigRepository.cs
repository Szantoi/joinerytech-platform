namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Domain.Aggregates;

/// <summary>
/// Repository for OverheadConfig aggregate
/// </summary>
public interface IOverheadConfigRepository
{
    /// <summary>
    /// Get overhead configuration for a tenant
    /// </summary>
    Task<OverheadConfig?> GetByTenantAsync(Guid tenantId, CancellationToken ct = default);

    /// <summary>
    /// Save (insert or update) overhead configuration
    /// </summary>
    Task SaveAsync(OverheadConfig config, CancellationToken ct = default);
}
