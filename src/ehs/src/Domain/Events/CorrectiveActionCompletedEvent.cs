using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: corrective action (unified CAPA) completed
/// </summary>
public record CorrectiveActionCompletedEvent(
    Guid CorrectiveActionId,
    CapaSource Source,
    Guid SourceId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
