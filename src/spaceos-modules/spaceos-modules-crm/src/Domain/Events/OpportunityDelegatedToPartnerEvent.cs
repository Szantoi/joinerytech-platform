using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is delegated to a B2B partner
/// </summary>
public sealed record OpportunityDelegatedToPartnerEvent(
    Guid OpportunityId,
    Guid PartnerId,
    Guid B2BHandshakeId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
