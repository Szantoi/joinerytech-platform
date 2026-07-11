using System;
using System.Collections.Generic;
using System.Linq;

namespace JoineryTech.CRM.Domain.Aggregates;

/// <summary>
/// Lead Aggregate Root - Represents an unqualified contact/inquiry before conversion to Opportunity.
/// </summary>
/// <remarks>
/// Lifecycle: New → Contacted → Qualified → Nurturing → Converted (terminal)
/// OR: Any state → Rejected (can be reopened from Rejected → New)
///
/// Invariants:
/// - ContactInfo.Email must be unique per tenant (enforced by repository)
/// - Status transitions must follow FSM rules
/// - Once Converted, cannot transition to any other state
/// - LeadScore is computed (not set directly)
/// </remarks>
public class Lead : AggregateRoot<LeadId>
{
    // ========== Identity ==========
    public LeadId Id { get; private set; }
    public TenantId TenantId { get; private set; }

    // ========== Contact Information ==========
    public ContactInfo Contact { get; private set; }
    public Address? Address { get; private set; }

    // ========== Business Context ==========
    public string CompanyName { get; private set; }
    public string? Industry { get; private set; }
    public Money EstimatedValue { get; private set; }

    // ========== Source Tracking ==========
    public LeadSource Source { get; private set; }
    public string? ReferralDetails { get; private set; }

    // ========== Status & Priority ==========
    public LeadStatus Status { get; private set; }
    public LeadPriority Priority { get; private set; }
    public LeadScore Score { get; private set; }

    // ========== Ownership ==========
    public UserId? AssignedTo { get; private set; }

    // ========== Notes & Activity ==========
    private readonly List<Activity> _activities = new();
    public IReadOnlyList<Activity> Activities => _activities.AsReadOnly();

    private readonly List<Note> _notes = new();
    public IReadOnlyList<Note> Notes => _notes.AsReadOnly();

    // ========== Timestamps ==========
    public DateTime CreatedAt { get; private set; }
    public DateTime? LastContactedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // ========== Conversion Reference ==========
    public OpportunityId? ConvertedToOpportunityId { get; private set; }

    // ========== Private constructor (EF Core) ==========
    private Lead() { }

    // ========== Factory Method ==========
    /// <summary>
    /// Creates a new Lead in "New" status.
    /// </summary>
    public static Lead Create(
        TenantId tenantId,
        ContactInfo contact,
        string companyName,
        LeadSource source,
        Money estimatedValue,
        UserId? assignedTo = null)
    {
        if (string.IsNullOrWhiteSpace(companyName))
            throw new DomainException("Company name cannot be empty");
        if (companyName.Length > 200)
            throw new DomainException("Company name cannot exceed 200 characters");

        var lead = new Lead
        {
            Id = LeadId.New(),
            TenantId = tenantId,
            Contact = contact,
            CompanyName = companyName,
            Source = source,
            EstimatedValue = estimatedValue,
            Status = LeadStatus.New,
            Priority = LeadPriority.Medium,
            Score = LeadScore.Initial(),
            AssignedTo = assignedTo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        lead.AddDomainEvent(new LeadCreatedEvent(lead.Id, lead.TenantId, lead.Contact.Email));
        return lead;
    }

    // ========== FSM State Transition Methods ==========

    /// <summary>
    /// Marks lead as contacted. Valid from: New, Contacted
    /// </summary>
    public Result MarkAsContacted(string? notes = null)
    {
        if (!CanTransition(Status, LeadStatus.Contacted))
            return Result.Failure($"Cannot transition from {Status} to Contacted");

        Status = LeadStatus.Contacted;
        LastContactedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(notes))
            AddNote(notes);

        AddDomainEvent(new LeadContactedEvent(Id, LastContactedAt.Value));
        return Result.Success();
    }

    /// <summary>
    /// Qualifies lead. Valid from: Contacted
    /// </summary>
    public Result Qualify(LeadScore score, string? reason = null)
    {
        if (!CanTransition(Status, LeadStatus.Qualified))
            return Result.Failure($"Cannot transition from {Status} to Qualified");

        Status = LeadStatus.Qualified;
        Score = score;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadQualifiedEvent(Id, score, reason));
        return Result.Success();
    }

    /// <summary>
    /// Starts nurturing process. Valid from: Qualified
    /// </summary>
    public Result StartNurturing()
    {
        if (!CanTransition(Status, LeadStatus.Nurturing))
            return Result.Failure($"Cannot transition from {Status} to Nurturing");

        Status = LeadStatus.Nurturing;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadNurturingStartedEvent(Id));
        return Result.Success();
    }

    /// <summary>
    /// Rejects lead. Valid from: Any non-terminal state
    /// </summary>
    public Result Reject(string reason)
    {
        if (!CanTransition(Status, LeadStatus.Rejected))
            return Result.Failure($"Cannot transition from {Status} to Rejected");

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure("Rejection reason is required");

        Status = LeadStatus.Rejected;
        UpdatedAt = DateTime.UtcNow;

        AddNote($"Rejected: {reason}");
        AddDomainEvent(new LeadRejectedEvent(Id, reason));
        return Result.Success();
    }

    /// <summary>
    /// Reopens rejected lead. Valid from: Rejected
    /// </summary>
    public Result Reopen()
    {
        if (!CanTransition(Status, LeadStatus.New))
            return Result.Failure($"Cannot reopen from status {Status}");

        Status = LeadStatus.New;
        UpdatedAt = DateTime.UtcNow;

        AddNote("Lead reopened");
        AddDomainEvent(new LeadReopenedEvent(Id));
        return Result.Success();
    }

    /// <summary>
    /// Converts lead to opportunity. Valid from: Qualified, Nurturing
    /// Returns the newly created Opportunity aggregate.
    /// </summary>
    public Result<Opportunity> ConvertToOpportunity(
        string opportunityName,
        Money opportunityValue,
        DateTime? expectedCloseDate = null)
    {
        if (!CanTransition(Status, LeadStatus.Converted))
            return Result<Opportunity>.Failure($"Cannot convert from status {Status}");

        if (string.IsNullOrWhiteSpace(opportunityName))
            return Result<Opportunity>.Failure("Opportunity name is required");

        // Create Opportunity aggregate
        var opportunity = Opportunity.CreateFromLead(
            tenantId: TenantId,
            leadId: Id,
            name: opportunityName,
            value: opportunityValue,
            contact: Contact,
            companyName: CompanyName,
            assignedTo: AssignedTo,
            expectedCloseDate: expectedCloseDate
        );

        // Update Lead status
        Status = LeadStatus.Converted;
        ConvertedToOpportunityId = opportunity.Id;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadConvertedEvent(Id, opportunity.Id));
        return Result<Opportunity>.Success(opportunity);
    }

    // ========== Activity & Notes Management ==========

    /// <summary>
    /// Logs an activity (call, email, meeting, etc.)
    /// </summary>
    public void LogActivity(ActivityType type, string description, UserId userId)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Activity description cannot be empty");

        var activity = new Activity(
            id: ActivityId.New(),
            type: type,
            description: description,
            occurredAt: DateTime.UtcNow,
            userId: userId
        );

        _activities.Add(activity);
        LastContactedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadActivityLoggedEvent(Id, type, DateTime.UtcNow));
    }

    /// <summary>
    /// Adds internal note.
    /// </summary>
    public void AddNote(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
            throw new DomainException("Note content cannot be empty");

        var note = new Note(
            id: NoteId.New(),
            content: content,
            createdAt: DateTime.UtcNow
        );

        _notes.Add(note);
        UpdatedAt = DateTime.UtcNow;
    }

    // ========== Assignment ==========

    /// <summary>
    /// Assigns lead to a user.
    /// </summary>
    public void Assign(UserId userId)
    {
        AssignedTo = userId;
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new LeadAssignedEvent(Id, userId));
    }

    /// <summary>
    /// Updates lead score (typically called by LeadScoringService).
    /// </summary>
    public void UpdateScore(LeadScore newScore)
    {
        Score = newScore;
        UpdatedAt = DateTime.UtcNow;
    }

    // ========== FSM Validation ==========

    /// <summary>
    /// Validates if a state transition is allowed.
    /// </summary>
    private bool CanTransition(LeadStatus from, LeadStatus to)
    {
        return (from, to) switch
        {
            // From New
            (LeadStatus.New, LeadStatus.Contacted) => true,
            (LeadStatus.New, LeadStatus.Rejected) => true,

            // From Contacted
            (LeadStatus.Contacted, LeadStatus.Qualified) => true,
            (LeadStatus.Contacted, LeadStatus.Rejected) => true,

            // From Qualified
            (LeadStatus.Qualified, LeadStatus.Nurturing) => true,
            (LeadStatus.Qualified, LeadStatus.Converted) => true,
            (LeadStatus.Qualified, LeadStatus.Rejected) => true,

            // From Nurturing
            (LeadStatus.Nurturing, LeadStatus.Converted) => true,
            (LeadStatus.Nurturing, LeadStatus.Rejected) => true,

            // From Rejected (can reopen)
            (LeadStatus.Rejected, LeadStatus.New) => true,

            // All other transitions are invalid
            _ => false
        };
    }
}

// ========== Supporting Value Objects & IDs ==========

public readonly record struct LeadId
{
    public Guid Value { get; }
    private LeadId(Guid value) => Value = value;
    public static LeadId New() => new(Guid.NewGuid());
    public static LeadId From(Guid value) => new(value);
}

public enum LeadPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}
