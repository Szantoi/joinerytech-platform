using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Domain.Events;

public record AssetOperatingHoursRecordedEvent(
    AssetId AssetId,
    Guid TenantId,
    decimal HoursAdded,
    decimal TotalHours) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
