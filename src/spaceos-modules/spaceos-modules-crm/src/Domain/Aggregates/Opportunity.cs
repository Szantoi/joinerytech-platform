using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.Entities;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Aggregates;

/// <summary>
/// Opportunity aggregate root - manages sales opportunity lifecycle
/// FSM States: Draft → Proposal → Negotiation → {Won | Lost | Abandoned}
/// </summary>
public class Opportunity : AggregateRoot
{
    private readonly List<Activity> _activities = new();
    private readonly List<CrmTask> _tasks = new();

    public Guid Id { get; private set; }
    public OpportunityStatus Status { get; private set; }
    public Guid? LeadRef { get; private set; }
    public ContactInfo ContactInfo { get; private set; } = null!;
    public Money EstimatedValue { get; private set; } = null!;
    public decimal Probability { get; private set; } // 0-100
    public DateTime? ExpectedCloseDate { get; private set; }
    public Guid AssignedTo { get; private set; }
    public Guid? QuoteRef { get; private set; } // Immutable once set
    public Guid? ConversionId { get; private set; } // Idempotency key for CRM→Sales conversion (ADR-063)
    public DateTime? ConversionStartedAt { get; private set; } // Timestamp for timeout detection (ADR-063)
    public Guid? B2BPartnerRef { get; private set; }
    public string? LossReason { get; private set; }
    public string? AbandonmentReason { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }
    public Guid TenantId { get; private set; }

    public IReadOnlyCollection<Activity> Activities => _activities.AsReadOnly();
    public IReadOnlyCollection<CrmTask> Tasks => _tasks.AsReadOnly();

    private Opportunity() { } // EF Core

    /// <summary>
    /// Create a new Opportunity in Draft status
    /// </summary>
    public static Opportunity Create(
        ContactInfo contactInfo,
        Money estimatedValue,
        Guid assignedTo,
        Guid tenantId)
    {
        if (contactInfo == null)
            throw new ArgumentNullException(nameof(contactInfo));

        if (estimatedValue == null)
            throw new ArgumentNullException(nameof(estimatedValue));

        if (assignedTo == Guid.Empty)
            throw new ArgumentException("AssignedTo user is required", nameof(assignedTo));

        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        var opportunity = new Opportunity
        {
            Id = Guid.NewGuid(),
            Status = OpportunityStatus.Draft,
            ContactInfo = contactInfo,
            EstimatedValue = estimatedValue,
            Probability = 10, // Default for Draft
            AssignedTo = assignedTo,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };

        opportunity.AddDomainEvent(new OpportunityCreatedEvent(
            opportunity.Id,
            null,
            opportunity.ContactInfo,
            opportunity.EstimatedValue,
            opportunity.AssignedTo,
            opportunity.TenantId));

        return opportunity;
    }

    /// <summary>
    /// Create Opportunity from converted Lead
    /// </summary>
    public static Opportunity CreateFromLead(
        Guid leadId,
        ContactInfo contactInfo,
        Money estimatedValue,
        Guid assignedTo,
        Guid tenantId)
    {
        var opportunity = Create(contactInfo, estimatedValue, assignedTo, tenantId);
        opportunity.LeadRef = leadId;
        return opportunity;
    }

    /// <summary>
    /// FSM Transition: Draft → Proposal
    /// Requires EstimatedValue > 0 and ExpectedCloseDate set
    /// </summary>
    public void Propose(DateTime expectedCloseDate)
    {
        if (Status != OpportunityStatus.Draft)
            throw new InvalidOperationException($"Cannot propose opportunity in status {Status}. Must be Draft.");

        if (expectedCloseDate.Date <= DateTime.UtcNow.Date)
            throw new ArgumentException("Expected close date must be in the future", nameof(expectedCloseDate));

        Status = OpportunityStatus.Proposal;
        ExpectedCloseDate = expectedCloseDate;
        Probability = 30; // Update probability for Proposal stage
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityProposedEvent(Id, EstimatedValue, expectedCloseDate));
    }

    /// <summary>
    /// FSM Transition: Proposal → Negotiation
    /// </summary>
    public void Negotiate(Money? updatedValue = null, decimal? updatedProbability = null)
    {
        if (Status != OpportunityStatus.Proposal)
            throw new InvalidOperationException($"Cannot negotiate opportunity in status {Status}. Must be Proposal.");

        if (updatedValue != null)
        {
            EstimatedValue = updatedValue;
        }

        if (updatedProbability.HasValue)
        {
            if (updatedProbability.Value < 0 || updatedProbability.Value > 100)
                throw new ArgumentException("Probability must be between 0 and 100", nameof(updatedProbability));

            Probability = updatedProbability.Value;
        }
        else
        {
            Probability = 60; // Default for Negotiation stage
        }

        Status = OpportunityStatus.Negotiation;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityNegotiatedEvent(Id, updatedValue, updatedProbability));
    }

    /// <summary>
    /// FSM Transition: Negotiation → Won
    /// </summary>
    public void Win(Guid wonBy)
    {
        if (Status != OpportunityStatus.Negotiation)
            throw new InvalidOperationException($"Cannot win opportunity in status {Status}. Must be Negotiation.");

        if (wonBy == Guid.Empty)
            throw new ArgumentException("WonBy user is required", nameof(wonBy));

        Status = OpportunityStatus.Won;
        Probability = 100;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityWonEvent(Id, EstimatedValue, QuoteRef, wonBy));
    }

    /// <summary>
    /// FSM Transition: Negotiation → Lost
    /// </summary>
    public void Lose(string reason, Guid lostBy)
    {
        if (Status != OpportunityStatus.Negotiation)
            throw new InvalidOperationException($"Cannot lose opportunity in status {Status}. Must be Negotiation.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Loss reason is required", nameof(reason));

        if (lostBy == Guid.Empty)
            throw new ArgumentException("LostBy user is required", nameof(lostBy));

        Status = OpportunityStatus.Lost;
        LossReason = reason;
        Probability = 0;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityLostEvent(Id, reason, lostBy));
    }

    /// <summary>
    /// FSM Transition: {Draft | Proposal} → Abandoned
    /// </summary>
    public void Abandon(string reason, Guid abandonedBy)
    {
        if (Status != OpportunityStatus.Draft && Status != OpportunityStatus.Proposal)
            throw new InvalidOperationException($"Cannot abandon opportunity in status {Status}. Must be Draft or Proposal.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Abandonment reason is required", nameof(reason));

        if (abandonedBy == Guid.Empty)
            throw new ArgumentException("AbandonedBy user is required", nameof(abandonedBy));

        Status = OpportunityStatus.Abandoned;
        AbandonmentReason = reason;
        Probability = 0;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityAbandonedEvent(Id, reason, abandonedBy));
    }

    /// <summary>
    /// FSM Transition: Negotiation → Proposal (revision)
    /// </summary>
    public void ReviseProposal(string revisionReason)
    {
        if (Status != OpportunityStatus.Negotiation)
            throw new InvalidOperationException($"Cannot revise opportunity in status {Status}. Must be Negotiation.");

        if (string.IsNullOrWhiteSpace(revisionReason))
            throw new ArgumentException("Revision reason is required", nameof(revisionReason));

        Status = OpportunityStatus.Proposal;
        Probability = 30; // Reset to Proposal probability
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityRevisedToProposalEvent(Id, revisionReason));
    }

    /// <summary>
    /// Set Quote reference (immutable once set)
    /// </summary>
    public void SetQuoteRef(Guid quoteId)
    {
        if (QuoteRef.HasValue)
            throw new InvalidOperationException("QuoteRef is immutable once set");

        if (quoteId == Guid.Empty)
            throw new ArgumentException("QuoteId cannot be empty", nameof(quoteId));

        QuoteRef = quoteId;
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Delegate to B2B partner
    /// </summary>
    public void DelegateToPartner(Guid partnerId, Guid b2bHandshakeId)
    {
        if (partnerId == Guid.Empty)
            throw new ArgumentException("PartnerId is required", nameof(partnerId));

        B2BPartnerRef = partnerId;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityDelegatedToPartnerEvent(Id, partnerId, b2bHandshakeId));
    }

    /// <summary>
    /// Add activity (logged interaction)
    /// </summary>
    public Guid AddActivity(ActivityType type, string description, Guid createdBy)
    {
        var activity = Activity.Log(type, description, createdBy);
        _activities.Add(activity);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityActivityAddedEvent(Id, activity.ActivityId, type, description));

        return activity.ActivityId;
    }

    /// <summary>
    /// Add follow-up task
    /// </summary>
    public Guid AddTask(string title, DateTime dueDate, CrmTaskPriority priority, Guid createdBy)
    {
        var task = CrmTask.Create(title, dueDate, priority, createdBy);
        _tasks.Add(task);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityTaskAddedEvent(Id, task.TaskId, title, dueDate));

        return task.TaskId;
    }

    /// <summary>
    /// Complete a task
    /// </summary>
    public void CompleteTask(Guid taskId, Guid completedBy)
    {
        var task = _tasks.FirstOrDefault(t => t.TaskId == taskId);
        if (task == null)
            throw new InvalidOperationException($"Task {taskId} not found");

        task.Complete(completedBy);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityTaskCompletedEvent(Id, taskId, completedBy));
    }

    /// <summary>
    /// FSM Transition: Negotiation → Converting (ADR-063)
    /// Start conversion to Sales Quote (async integration)
    /// </summary>
    public void StartConversion(Guid conversionId)
    {
        if (Status != OpportunityStatus.Negotiation && Status != OpportunityStatus.Converting)
            throw new InvalidOperationException($"Cannot start conversion in status {Status}. Must be Negotiation.");

        // Idempotent - already converting with same ID
        if (ConversionId == conversionId && Status == OpportunityStatus.Converting)
            return;

        Status = OpportunityStatus.Converting;
        ConversionId = conversionId;
        ConversionStartedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        // Note: OpportunityConvertedToQuoteEvent will be published by Application layer
        // (requires LineItems data from persistence context)
    }

    /// <summary>
    /// FSM Transition: Converting → Won (ADR-063)
    /// Complete conversion after successful Quote creation
    /// </summary>
    public void CompleteConversion(Guid quoteId)
    {
        if (Status != OpportunityStatus.Converting)
            throw new InvalidOperationException($"Cannot complete conversion in status {Status}. Must be Converting.");

        Status = OpportunityStatus.Won;
        QuoteRef = quoteId;
        ConversionId = null;
        ConversionStartedAt = null;
        Probability = 100;
        ClosedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityWonEvent(Id, EstimatedValue, QuoteRef, AssignedTo));
    }

    /// <summary>
    /// FSM Transition: Converting → Negotiation (ADR-063)
    /// Rollback conversion on timeout or failure
    /// </summary>
    public void RollbackConversion(string reason)
    {
        if (Status != OpportunityStatus.Converting)
            return; // Idempotent - already rolled back

        Status = OpportunityStatus.Negotiation;
        ConversionId = null;
        ConversionStartedAt = null;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityConversionRolledBackEvent(Id, reason));
    }
}
