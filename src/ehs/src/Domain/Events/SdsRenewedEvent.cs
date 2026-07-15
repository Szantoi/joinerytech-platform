using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.Ehs.Domain.Events;

/// <summary>
/// Domain event: new SDS version registered for a hazardous material
/// </summary>
public record SdsRenewedEvent(
    Guid MaterialId,
    DateTimeOffset NewExpiresAt
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
