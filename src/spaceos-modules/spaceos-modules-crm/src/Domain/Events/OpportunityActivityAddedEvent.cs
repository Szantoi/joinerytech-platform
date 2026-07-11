using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an activity is added to an Opportunity
/// </summary>
public sealed record OpportunityActivityAddedEvent(
    Guid OpportunityId,
    Guid ActivityId,
    ActivityType Type,
    string Description
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
