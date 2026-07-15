using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.Ehs.Domain.Enums;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: EHS location created in the hierarchical registry
/// </summary>
public record LocationCreatedEvent(
    Guid LocationId,
    LocationKind Kind
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
