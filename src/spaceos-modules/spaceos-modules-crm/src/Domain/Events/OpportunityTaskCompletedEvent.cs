using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when a task on an Opportunity is completed
/// </summary>
public sealed record OpportunityTaskCompletedEvent(
    Guid OpportunityId,
    Guid TaskId,
    Guid CompletedBy
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
