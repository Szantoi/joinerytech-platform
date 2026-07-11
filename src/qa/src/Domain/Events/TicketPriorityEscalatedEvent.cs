using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record TicketPriorityEscalatedEvent(
    TicketId TicketId,
    Guid TenantId,
    CrmTaskPriority OldPriority,
    CrmTaskPriority NewPriority) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
