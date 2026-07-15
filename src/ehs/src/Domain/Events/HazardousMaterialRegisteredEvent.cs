using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: hazardous material registered in the SDS registry
/// </summary>
public record HazardousMaterialRegisteredEvent(
    Guid MaterialId,
    string Name
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
