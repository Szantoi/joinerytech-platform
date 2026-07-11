using SpaceOS.Modules.CRM.Domain.Common;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Events;

/// <summary>
/// Domain events for Lead aggregate lifecycle (ADR-054).
/// </summary>

/// <summary>Raised when a new lead is created.</summary>
public sealed class LeadCreatedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public ContactInfo ContactInfo { get; init; } = default!;
    public LeadSource Source { get; init; }
    public Guid AssignedTo { get; init; }
    public Guid CreatedBy { get; init; }
}

/// <summary>Raised when a lead is contacted (moved to Contacted status).</summary>
public sealed class LeadContactedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public DateTimeOffset ContactedAt { get; init; }
    public string? Notes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>Raised when a lead is qualified (moved to Qualified status).</summary>
public sealed class LeadQualifiedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public DateTimeOffset QualifiedAt { get; init; }
    public string? QualificationNotes { get; init; }
    public Guid ActedBy { get; init; }
}

/// <summary>Raised when a lead is disqualified.</summary>
public sealed class LeadDisqualifiedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public string DisqualificationReason { get; init; } = default!;
    public Guid DisqualifiedBy { get; init; }
}

/// <summary>Raised when a qualified lead is converted to an opportunity.</summary>
public sealed class LeadConvertedToOpportunityEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public Guid OpportunityId { get; init; }
    public Guid CustomerId { get; init; }
    public Guid ConvertedBy { get; init; }
}

/// <summary>Raised when lead ownership is reassigned.</summary>
public sealed class LeadReassignedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public Guid FromUserId { get; init; }
    public Guid ToUserId { get; init; }
    public Guid ReassignedBy { get; init; }
}

/// <summary>Raised when an activity is logged on a lead (call, email, meeting, etc).</summary>
public sealed class LeadActivityLoggedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public string ActivityType { get; init; } = default!; // "call", "email", "meeting", "note"
    public string Description { get; init; } = default!;
    public Guid LoggedBy { get; init; }
    public DateTimeOffset LoggedAt { get; init; }
}

/// <summary>Raised when a task is created for a lead.</summary>
public sealed class LeadTaskCreatedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public Guid TaskId { get; init; }
    public string TaskTitle { get; init; } = default!;
    public DateTimeOffset DueDate { get; init; }
    public string Priority { get; init; } = "medium";
    public Guid CreatedBy { get; init; }
}

/// <summary>Raised when a task on a lead is completed.</summary>
public sealed class LeadTaskCompletedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public Guid TaskId { get; init; }
    public Guid CompletedBy { get; init; }
    public DateTimeOffset CompletedAt { get; init; }
}

/// <summary>Raised when lead contact information is updated.</summary>
public sealed class LeadContactInfoUpdatedEvent : DomainEvent
{
    public Guid LeadId { get; init; }
    public ContactInfo NewContactInfo { get; init; } = default!;
    public Guid UpdatedBy { get; init; }
}
