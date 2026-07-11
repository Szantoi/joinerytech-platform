using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record TicketReopenedEvent(
    TicketId TicketId,
    Guid TenantId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
