using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity transitions to Proposal status
/// </summary>
public sealed record OpportunityProposedEvent(
    Guid OpportunityId,
    Money EstimatedValue,
    DateTime ExpectedCloseDate
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
