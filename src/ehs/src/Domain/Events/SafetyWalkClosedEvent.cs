using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: safety walk closed (FSM: ActionRequired → Closed)
/// </summary>
public record SafetyWalkClosedEvent(
    Guid SafetyWalkId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
