using SpaceOS.Modules.Maintenance.Domain.Aggregates;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// CRITICAL SERVICE: Calculates computed asset status.
/// AssetStatus is NEVER stored in database, always computed on-demand!
///
/// Logic:
/// - Retired → AssetStatus.Retired
/// - InProgress WO with RequiresDowntime=true and Type=Corrective → AssetStatus.Breakdown
/// - InProgress WO with RequiresDowntime=true and Type!=Corrective → AssetStatus.Maintenance
/// - Otherwise → AssetStatus.Operational
/// </summary>
public class AssetStatusCalculationService : IAssetStatusCalculationService
{
    /// <summary>
    /// Calculates the computed status of an asset based on its state and active work orders.
    /// </summary>
    public AssetStatus GetAssetStatus(Asset asset, IEnumerable<WorkOrder> activeWorkOrders)
    {
        if (asset == null) throw new ArgumentNullException(nameof(asset));
        if (activeWorkOrders == null) throw new ArgumentNullException(nameof(activeWorkOrders));

        // Retired assets always return Retired status
        if (asset.Retired)
            return AssetStatus.Retired;

        // Find in-progress work orders with downtime requirement for this asset
        var inProgressWithDowntime = activeWorkOrders
            .Where(wo => wo.AssetId.Value == asset.Id.Value
                         && wo.Status == WorkOrderStatus.InProgress
                         && wo.RequiresDowntime)
            .ToList();

        if (!inProgressWithDowntime.Any())
            return AssetStatus.Operational;

        // Check if any in-progress WO is corrective (breakdown)
        var hasBreakdown = inProgressWithDowntime.Any(wo => wo.Type == WorkOrderType.Corrective);
        if (hasBreakdown)
            return AssetStatus.Breakdown;

        // Otherwise it's planned maintenance or cleaning
        return AssetStatus.Maintenance;
    }
}
