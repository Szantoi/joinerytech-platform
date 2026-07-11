using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is won
/// </summary>
public sealed record OpportunityWonEvent(
    Guid OpportunityId,
    Money FinalValue,
    Guid? QuoteRef,
    Guid WonBy
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
