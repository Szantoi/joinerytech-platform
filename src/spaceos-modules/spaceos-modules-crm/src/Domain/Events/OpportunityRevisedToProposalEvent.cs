using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is revised back to Proposal
/// </summary>
public sealed record OpportunityRevisedToProposalEvent(
    Guid OpportunityId,
    string RevisionReason
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
