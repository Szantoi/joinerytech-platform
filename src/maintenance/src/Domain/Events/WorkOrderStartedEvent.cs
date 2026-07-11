using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.Events;

/// <summary>
/// CRITICAL: Includes RequiresDowntime for Production integration
/// </summary>
public record WorkOrderStartedEvent(
    WorkOrderId WorkOrderId,
    Guid TenantId,
    AssetId AssetId,
    WorkOrderType Type,
    bool RequiresDowntime) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
