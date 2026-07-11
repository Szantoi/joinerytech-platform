using SpaceOS.Modules.CRM.Domain.Common;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain events for Opportunity aggregate lifecycle (ADR-054).
/// </summary>

/// <summary>Raised when a new opportunity is created (from converted lead or direct creation).</summary>
public sealed class OpportunityCreatedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public Guid? LeadId { get; init; } // Nullable if created directly
    public Guid CustomerId { get; init; }
    public ContactInfo ContactInfo { get; init; } = default!;
    public Money EstimatedValue { get; init; } = default!;
    public string Title { get; init; } = default!;
    public Guid AssignedTo { get; init; }
    public Guid CreatedBy { get; init; }
}

/// <summary>Raised when opportunity moves to NeedsAssessment status.</summary>
public sealed class OpportunityNeedsAssessmentStartedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public DateTimeOffset StartedAt { get; init; }
    public Guid StartedBy { get; init; }
}

/// <summary>Raised when opportunity moves to SolutionAssembly status.</summary>
public sealed class OpportunitySolutionAssemblyStartedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public DateTimeOffset StartedAt { get; init; }
    public Guid StartedBy { get; init; }
}

/// <summary>Raised when a proposal/quote is sent for the opportunity.</summary>
public sealed class OpportunityProposalSentEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public Guid QuoteId { get; init; }
    public DateTimeOffset SentAt { get; init; }
    public decimal? UpdatedProbability { get; init; }
    public Guid SentBy { get; init; }
}

/// <summary>Raised when opportunity enters negotiation phase.</summary>
public sealed class OpportunityNegotiationStartedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public DateTimeOffset StartedAt { get; init; }
    public decimal UpdatedProbability { get; init; }
    public Guid StartedBy { get; init; }
}

/// <summary>Raised when opportunity is won (order created).</summary>
public sealed class OpportunityWonEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public Guid OrderId { get; init; }
    public Money FinalValue { get; init; } = default!;
    public DateTimeOffset WonAt { get; init; }
    public Guid WonBy { get; init; }
}

/// <summary>Raised when opportunity is lost.</summary>
public sealed class OpportunityLostEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public string? LossReason { get; init; }
    public string? CompetitorName { get; init; }
    public DateTimeOffset LostAt { get; init; }
    public Guid LostBy { get; init; }
}

/// <summary>Raised when opportunity is abandoned (canceled).</summary>
public sealed class OpportunityAbandonedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public string AbandonmentReason { get; init; } = default!;
    public DateTimeOffset AbandonedAt { get; init; }
    public Guid AbandonedBy { get; init; }
}

/// <summary>Raised when opportunity's estimated value or probability is updated.</summary>
public sealed class OpportunityEstimateUpdatedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public Money? NewEstimatedValue { get; init; }
    public decimal? NewProbability { get; init; }
    public Guid UpdatedBy { get; init; }
}

/// <summary>Raised when opportunity ownership is reassigned.</summary>
public sealed class OpportunityReassignedEvent : DomainEvent
{
    public Guid OpportunityId { get; init; }
    public Guid FromUserId { get; init; }
    public Guid ToUserId { get; init; }
    public Guid ReassignedBy { get; init; }
}
