using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: safety walk started (FSM: Scheduled → InProgress)
/// </summary>
public record SafetyWalkStartedEvent(
    Guid SafetyWalkId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
