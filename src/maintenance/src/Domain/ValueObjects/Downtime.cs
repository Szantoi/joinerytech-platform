using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.ValueObjects;

/// <summary>
/// Downtime value object for Production integration
/// </summary>
public record Downtime(
    AssetId AssetId,
    string MachineId,
    WorkOrderId WorkOrderId,
    DateTime StartedAt,
    DateTime? EstimatedEndAt,
    WorkOrderType Type);
