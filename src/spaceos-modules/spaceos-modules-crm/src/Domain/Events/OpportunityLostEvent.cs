using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is lost
/// </summary>
public sealed record OpportunityLostEvent(
    Guid OpportunityId,
    string Reason,
    Guid LostBy
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
