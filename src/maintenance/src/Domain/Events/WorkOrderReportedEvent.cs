using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.Events;

public record WorkOrderReportedEvent(
    WorkOrderId WorkOrderId,
    Guid TenantId,
    AssetId AssetId,
    WorkOrderType Type,
    WorkOrderPriority Priority,
    string Title) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
