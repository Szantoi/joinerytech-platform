using SpaceOS.Modules.CRM.Domain.Aggregates;

namespace SpaceOS.Modules.CRM.Application.Interfaces;

/// <summary>
/// Repository interface for Lead aggregate
/// </summary>
public interface ILeadRepository
{
    Task<Lead?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Lead>> GetByStatusAsync(string status, Guid tenantId, CancellationToken ct = default);
    Task<IReadOnlyList<Lead>> GetByAssignedUserAsync(Guid userId, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(Lead lead, CancellationToken ct = default);
    Task UpdateAsync(Lead lead, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
