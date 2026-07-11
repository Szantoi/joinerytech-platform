using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.StrongIds;

namespace SpaceOS.Modules.QA.Domain.Events;

public record TicketReportedEvent(
    TicketId TicketId,
    Guid TenantId,
    TicketType TicketType,
    string Title,
    CrmTaskPriority Priority,
    Guid ReportedBy) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
