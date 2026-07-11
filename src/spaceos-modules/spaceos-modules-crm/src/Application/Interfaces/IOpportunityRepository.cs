using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.Interfaces;

/// <summary>
/// Repository interface for Opportunity aggregate
/// </summary>
public interface IOpportunityRepository
{
    Task<Opportunity?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Opportunity?> GetByConversionIdAsync(Guid conversionId, CancellationToken ct = default);
    Task<IReadOnlyList<Opportunity>> GetByStatusAsync(string status, Guid tenantId, CancellationToken ct = default);
    Task<IReadOnlyList<Opportunity>> GetAllAsync(Guid tenantId, CancellationToken ct = default);
    Task AddAsync(Opportunity opportunity, CancellationToken ct = default);
    Task UpdateAsync(Opportunity opportunity, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);

    /// <summary>
    /// Get opportunities in Converting state older than specified timespan (ADR-063)
    /// Used by ConversionTimeoutMonitor to rollback stuck conversions
    /// </summary>
    Task<IEnumerable<Opportunity>> GetConvertingOpportunitiesOlderThanAsync(TimeSpan timeout, CancellationToken ct = default);
}
