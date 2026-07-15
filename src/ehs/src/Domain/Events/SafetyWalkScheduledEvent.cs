using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: safety walk scheduled (FSM: → Scheduled)
/// </summary>
public record SafetyWalkScheduledEvent(
    Guid SafetyWalkId,
    Guid LocationId,
    DateTimeOffset ScheduledDate
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
