using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: finding recorded during a safety walk
/// </summary>
public record SafetyWalkFindingRecordedEvent(
    Guid SafetyWalkId,
    Guid FindingId,
    Severity Severity,
    bool RequiresAction
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
