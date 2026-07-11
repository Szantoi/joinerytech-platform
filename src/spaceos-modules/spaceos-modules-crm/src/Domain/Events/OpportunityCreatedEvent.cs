using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain event raised when an Opportunity is created
/// </summary>
public sealed record OpportunityCreatedEvent(
    Guid OpportunityId,
    Guid? LeadRef,
    ContactInfo ContactInfo,
    Money EstimatedValue,
    Guid AssignedTo,
    Guid TenantId
) : IDomainEvent
{
    public DateTimeOffset OccurredOn { get; init; } = DateTimeOffset.UtcNow;
}
