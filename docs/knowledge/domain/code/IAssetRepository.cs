namespace JoineryTech.Maintenance.Domain.Repositories;

using JoineryTech.Maintenance.Domain.Aggregates;
using JoineryTech.Maintenance.Domain.ValueObjects;
using JoineryTech.Maintenance.Domain.Enums;
using JoineryTech.SharedKernel;

/// <summary>
/// Repository contract for Asset aggregate
/// </summary>
public interface IAssetRepository
{
    // ============ QUERIES ============

    /// <summary>
    /// Get asset by ID (with RLS enforcement)
    /// </summary>
    Task<Asset?> GetByIdAsync(AssetId id, CancellationToken ct = default);

    /// <summary>
    /// Get asset by code (unique constraint per tenant)
    /// </summary>
    Task<Asset?> GetByCodeAsync(string code, CancellationToken ct = default);

    /// <summary>
    /// Get all active assets (not retired) (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Asset>> GetActiveAssetsAsync(CancellationToken ct = default);

    /// <summary>
    /// Get assets by kind (Machine, Vehicle, Tool, etc.) (with RLS enforcement)
    /// </summary>
    Task<IEnumerable<Asset>> GetByKindAsync(AssetKind kind, CancellationToken ct = default);

    /// <summary>
    /// Get assets linked to production machines (with RLS enforcement)
    /// Used for production downtime coordination
    /// </summary>
    Task<IEnumerable<Asset>> GetByMachineIdAsync(string machineId, CancellationToken ct = default);

    /// <summary>
    /// Get assets linked to logistics vehicles (with RLS enforcement)
    /// Used for fleet management coordination
    /// </summary>
    Task<IEnumerable<Asset>> GetByVehicleIdAsync(string vehicleId, CancellationToken ct = default);

    /// <summary>
    /// Get assets with preventive maintenance due (with RLS enforcement)
    /// Used by PreventiveMaintenanceSchedulerService
    /// </summary>
    Task<IEnumerable<Asset>> GetAssetsWithMaintenanceDueAsync(DateOnly today, int withinDays = 7, CancellationToken ct = default);

    /// <summary>
    /// Get paged assets with optional filters (with RLS enforcement)
    /// </summary>
    Task<PagedResult<Asset>> GetPagedAsync(
        int page,
        int pageSize,
        AssetKind? kindFilter = null,
        bool? retiredFilter = null,
        string? searchTerm = null,
        CancellationToken ct = default);

    // ============ COMMANDS ============

    /// <summary>
    /// Add new asset (domain events not persisted here - use event bus)
    /// </summary>
    Task AddAsync(Asset asset, CancellationToken ct = default);

    /// <summary>
    /// Update existing asset (domain events not persisted here - use event bus)
    /// </summary>
    Task UpdateAsync(Asset asset, CancellationToken ct = default);

    // ============ VALIDATION ============

    /// <summary>
    /// Check if asset code already exists for this tenant (unique constraint)
    /// </summary>
    Task<bool> CodeExistsAsync(string code, TenantId tenantId, CancellationToken ct = default);

    // ============ AGGREGATE LOADING ============

    /// <summary>
    /// Get asset by ID with all child entities loaded (MaintenancePlans)
    /// Use when full aggregate is needed (e.g., preventive maintenance scheduling)
    /// </summary>
    Task<Asset?> GetByIdWithPlansAsync(AssetId id, CancellationToken ct = default);

    /// <summary>
    /// Get asset by ID with work order history (last N work orders)
    /// Use for maintenance history display, downtime analysis
    /// </summary>
    Task<Asset?> GetByIdWithHistoryAsync(AssetId id, int lastNWorkOrders = 10, CancellationToken ct = default);
}
