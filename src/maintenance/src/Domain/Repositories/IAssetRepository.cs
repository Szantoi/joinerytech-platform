using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.Repositories;

/// <summary>
/// Asset repository contract for persistence operations.
/// </summary>
public interface IAssetRepository
{
    /// <summary>
    /// Gets an asset by its ID.
    /// </summary>
    Task<Asset?> GetByIdAsync(AssetId id, CancellationToken ct = default);

    /// <summary>
    /// Gets an asset by its unique code within a tenant.
    /// </summary>
    Task<Asset?> GetByCodeAsync(TenantId tenantId, string code, CancellationToken ct = default);

    /// <summary>
    /// Gets all active (non-retired) assets of a specific kind for a tenant.
    /// </summary>
    Task<IEnumerable<Asset>> GetActiveByKindAsync(TenantId tenantId, AssetKind kind, CancellationToken ct = default);

    /// <summary>
    /// Gets all active (non-retired) assets for a specific facility.
    /// </summary>
    Task<IEnumerable<Asset>> GetActiveByFacilityAsync(TenantId tenantId, FacilityId facilityId, CancellationToken ct = default);

    /// <summary>
    /// Gets assets linked to a specific Production machine.
    /// </summary>
    Task<IEnumerable<Asset>> GetByMachineIdAsync(TenantId tenantId, string machineId, CancellationToken ct = default);

    /// <summary>
    /// Adds a new asset.
    /// </summary>
    Task AddAsync(Asset asset, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing asset.
    /// </summary>
    Task UpdateAsync(Asset asset, CancellationToken ct = default);
}
