using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: safety walk completed
/// (FSM: InProgress → ActionRequired when findings require action, otherwise → Closed)
/// </summary>
public record SafetyWalkCompletedEvent(
    Guid SafetyWalkId,
    SafetyWalkStatus ResultingStatus
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
