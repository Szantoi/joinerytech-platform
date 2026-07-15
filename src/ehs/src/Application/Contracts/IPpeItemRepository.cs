using SpaceOS.Modules.Ehs.Domain.Aggregates.PpeAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for PpeItem aggregate (PPE catalogue).
/// Implementation in Infrastructure layer.
/// </summary>
public interface IPpeItemRepository
{
    Task<PpeItem?> GetByIdAsync(Guid ppeItemId, Guid tenantId, CancellationToken ct = default);
    Task<List<PpeItem>> ListAsync(PpeItemFilter filter, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(PpeItem item, CancellationToken ct = default);
    Task UpdateAsync(PpeItem item, CancellationToken ct = default);
}

/// <summary>Filter for the PPE catalogue list</summary>
public record PpeItemFilter(
    bool? ActiveOnly = null,
    PpeCategory? Category = null
);
