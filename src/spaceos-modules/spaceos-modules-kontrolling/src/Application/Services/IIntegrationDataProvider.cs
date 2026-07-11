namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Application.DTOs;

/// <summary>
/// Provider for integration data from other modules (Production, HR, Finance, etc.)
/// </summary>
public interface IIntegrationDataProvider
{
    /// <summary>
    /// Get aggregated cost data for a project from all integrated modules
    /// </summary>
    Task<ProjectIntegrationData> GetProjectDataAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default);

    /// <summary>
    /// Get list of active projects for a tenant with basic metadata
    /// </summary>
    Task<IEnumerable<ProjectInfo>> GetActiveProjectsAsync(
        Guid tenantId,
        CancellationToken ct = default);
}

/// <summary>
/// Basic project information for portfolio queries
/// </summary>
public record ProjectInfo(Guid ProjectId, string ProjectName);
