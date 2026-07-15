using SpaceOS.Modules.Ehs.Domain.Aggregates.LocationAggregate;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Application.Contracts;

/// <summary>
/// Repository contract for EhsLocation aggregate (hierarchical location registry).
/// Implementation in Infrastructure layer.
/// </summary>
public interface IEhsLocationRepository
{
    Task<EhsLocation?> GetByIdAsync(Guid locationId, Guid tenantId, CancellationToken ct = default);
    Task<List<EhsLocation>> ListAsync(LocationFilter filter, Guid tenantId, CancellationToken ct = default);
    Task AddAsync(EhsLocation location, CancellationToken ct = default);
    Task UpdateAsync(EhsLocation location, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid locationId, Guid tenantId, CancellationToken ct = default);

    /// <summary>True when the location has at least one ACTIVE child (deactivation guard)</summary>
    Task<bool> HasActiveChildrenAsync(Guid locationId, Guid tenantId, CancellationToken ct = default);
}

/// <summary>Filter for the flat location list (clients build the tree from ParentLocationId)</summary>
public record LocationFilter(
    bool? ActiveOnly = null,
    LocationKind? Kind = null,
    Guid? ParentLocationId = null
);
