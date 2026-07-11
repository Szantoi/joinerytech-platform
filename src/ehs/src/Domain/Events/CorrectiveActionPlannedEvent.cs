using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: Corrective action planned
/// </summary>
public record CorrectiveActionPlannedEvent(
    Guid IncidentId,
    Guid CorrectiveActionId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
