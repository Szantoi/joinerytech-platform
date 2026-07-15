using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: safety walk cancelled (FSM: Scheduled → Cancelled)
/// </summary>
public record SafetyWalkCancelledEvent(
    Guid SafetyWalkId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
