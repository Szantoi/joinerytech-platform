namespace SpaceOS.Modules.Kontrolling.Application.Services;

using SpaceOS.Modules.Kontrolling.Domain.Aggregates;

/// <summary>
/// Service for calculating project costs by aggregating integration data
/// </summary>
public interface IProjectCostCalculationService
{
    /// <summary>
    /// Calculate project cost summary with EAC, overhead, and variance
    /// </summary>
    Task<ProjectCostCalculation> CalculateAsync(
        Guid projectId,
        Guid tenantId,
        CancellationToken ct = default);
}
