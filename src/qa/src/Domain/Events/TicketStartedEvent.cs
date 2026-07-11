using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record TicketStartedEvent(
    TicketId TicketId,
    Guid TenantId,
    Guid AssigneeEmployeeId) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
