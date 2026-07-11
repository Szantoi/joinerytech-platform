using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: Investigation started
/// </summary>
public record InvestigationStartedEvent(
    Guid IncidentId,
    Guid InvestigatedBy
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
