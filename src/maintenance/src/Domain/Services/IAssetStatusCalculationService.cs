using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// Interface for asset status calculation service.
/// </summary>
public interface IAssetStatusCalculationService
{
    /// <summary>
    /// Calculates the computed status of an asset based on its state and active work orders.
    /// IMPORTANT: AssetStatus is NEVER stored, always computed!
    /// </summary>
    AssetStatus GetAssetStatus(Asset asset, IEnumerable<WorkOrder> activeWorkOrders);
}
