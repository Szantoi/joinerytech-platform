using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity conversion to Quote is rolled back (ADR-063)
/// </summary>
public sealed record OpportunityConversionRolledBackEvent(
    Guid OpportunityId,
    string Reason
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
