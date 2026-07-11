using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is abandoned
/// </summary>
public sealed record OpportunityAbandonedEvent(
    Guid OpportunityId,
    string Reason,
    Guid AbandonedBy
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
