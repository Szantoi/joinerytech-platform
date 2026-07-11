using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity transitions to Negotiation status
/// </summary>
public sealed record OpportunityNegotiatedEvent(
    Guid OpportunityId,
    Money? UpdatedValue,
    decimal? UpdatedProbability
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
