using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

public record LeadCreatedEvent(
    Guid LeadId,
    Guid TenantId,
    string Name
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
