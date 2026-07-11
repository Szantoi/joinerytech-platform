using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when a task is added to an Opportunity
/// </summary>
public sealed record OpportunityTaskAddedEvent(
    Guid OpportunityId,
    Guid TaskId,
    string Title,
    DateTime DueDate
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
