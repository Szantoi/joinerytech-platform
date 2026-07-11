using System;
using System.Collections.Generic;
using System.Linq;

namespace JoineryTech.CRM.Domain.Aggregates;

/// <summary>
/// Opportunity Aggregate Root - Represents a qualified sales opportunity tracking through the sales pipeline.
/// </summary>
/// <remarks>
/// Lifecycle: Open → NeedsAnalysis → Proposal → Quote → Negotiation → Won/Lost (terminal)
///
/// Invariants:
/// - Probability must be 0-100%
/// - Probability increases as status advances
/// - ExpectedCloseDate must be in the future (for non-closed opportunities)
/// - Once Won or Lost, cannot transition to any other state
/// </remarks>
public class Opportunity : AggregateRoot<OpportunityId>
{
    // ========== Identity ==========
    public OpportunityId Id { get; private set; }
    public TenantId TenantId { get; private set; }
    public LeadId? LeadId { get; private set; } // Back-reference to source Lead (null if created directly)

    // ========== Basic Info ==========
    public string Name { get; private set; }
    public string CompanyName { get; private set; }
    public ContactInfo Contact { get; private set; }

    // ========== Sales Info ==========
    public Money Value { get; private set; }
    public decimal Probability { get; private set; } // 0-100%
    public Money WeightedValue => new(Value.Amount * (Probability / 100m), Value.Currency);

    // ========== Status & Priority ==========
    public OpportunityStatus Status { get; private set; }
    public OpportunityPriority Priority { get; private set; }

    // ========== Ownership ==========
    public UserId? AssignedTo { get; private set; }

    // ========== Dates ==========
    public DateTime? ExpectedCloseDate { get; private set; }
    public DateTime? ActualCloseDate { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    // ========== Win/Loss Info ==========
    public string? WinReason { get; private set; }
    public string? LossReason { get; private set; }
    public string? CompetitorLostTo { get; private set; }

    // ========== Activities, Notes & Tasks ==========
    private readonly List<Activity> _activities = new();
    public IReadOnlyList<Activity> Activities => _activities.AsReadOnly();

    private readonly List<Note> _notes = new();
    public IReadOnlyList<Note> Notes => _notes.AsReadOnly();

    private readonly List<CrmTask> _tasks = new();
    public IReadOnlyList<CrmTask> Tasks => _tasks.AsReadOnly();

    // ========== Private constructor (EF Core) ==========
    private Opportunity() { }

    // ========== Factory Methods ==========

    /// <summary>
    /// Creates Opportunity from a converted Lead.
    /// </summary>
    public static Opportunity CreateFromLead(
        TenantId tenantId,
        LeadId leadId,
        string name,
        Money value,
        ContactInfo contact,
        string companyName,
        UserId? assignedTo,
        DateTime? expectedCloseDate = null)
    {
        return Create(tenantId, name, value, contact, companyName, assignedTo, expectedCloseDate, leadId);
    }

    /// <summary>
    /// Creates Opportunity directly (not from Lead).
    /// </summary>
    public static Opportunity Create(
        TenantId tenantId,
        string name,
        Money value,
        ContactInfo contact,
        string companyName,
        UserId? assignedTo,
        DateTime? expectedCloseDate = null,
        LeadId? leadId = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Opportunity name cannot be empty");
        if (name.Length > 200)
            throw new DomainException("Opportunity name cannot exceed 200 characters");

        var opportunity = new Opportunity
        {
            Id = OpportunityId.New(),
            TenantId = tenantId,
            LeadId = leadId,
            Name = name,
            Value = value,
            Contact = contact,
            CompanyName = companyName,
            Status = OpportunityStatus.Open,
            Priority = OpportunityPriority.Medium,
            Probability = 10m, // Initial probability
            AssignedTo = assignedTo,
            ExpectedCloseDate = expectedCloseDate ?? DateTime.UtcNow.AddDays(30),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        opportunity.AddDomainEvent(new OpportunityCreatedEvent(
            opportunity.Id,
            opportunity.TenantId,
            opportunity.LeadId,
            opportunity.Name,
            opportunity.Value
        ));

        return opportunity;
    }

    // ========== FSM State Transition Methods ==========

    /// <summary>
    /// Moves to Needs Analysis stage. Valid from: Open
    /// </summary>
    public Result MoveToNeedsAnalysis()
    {
        if (!CanTransition(Status, OpportunityStatus.NeedsAnalysis))
            return Result.Failure($"Cannot transition from {Status} to NeedsAnalysis");

        Status = OpportunityStatus.NeedsAnalysis;
        Probability = 20m;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityStageChangedEvent(Id, Status));
        return Result.Success();
    }

    /// <summary>
    /// Moves to Proposal stage. Valid from: NeedsAnalysis
    /// </summary>
    public Result MoveToProposal()
    {
        if (!CanTransition(Status, OpportunityStatus.Proposal))
            return Result.Failure($"Cannot transition from {Status} to Proposal");

        Status = OpportunityStatus.Proposal;
        Probability = 50m;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityStageChangedEvent(Id, Status));
        return Result.Success();
    }

    /// <summary>
    /// Moves to Quote stage. Valid from: Proposal
    /// </summary>
    public Result MoveToQuote()
    {
        if (!CanTransition(Status, OpportunityStatus.Quote))
            return Result.Failure($"Cannot transition from {Status} to Quote");

        Status = OpportunityStatus.Quote;
        Probability = 70m;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityStageChangedEvent(Id, Status));
        return Result.Success();
    }

    /// <summary>
    /// Moves to Negotiation stage. Valid from: Quote
    /// </summary>
    public Result MoveToNegotiation()
    {
        if (!CanTransition(Status, OpportunityStatus.Negotiation))
            return Result.Failure($"Cannot transition from {Status} to Negotiation");

        Status = OpportunityStatus.Negotiation;
        Probability = 90m;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityStageChangedEvent(Id, Status));
        return Result.Success();
    }

    /// <summary>
    /// Marks opportunity as Won. Valid from: Negotiation
    /// </summary>
    public Result Win(string reason)
    {
        if (!CanTransition(Status, OpportunityStatus.Won))
            return Result.Failure($"Cannot transition from {Status} to Won");

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure("Win reason is required");

        Status = OpportunityStatus.Won;
        Probability = 100m;
        ActualCloseDate = DateTime.UtcNow;
        WinReason = reason;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityWonEvent(Id, Value, WinReason));
        return Result.Success();
    }

    /// <summary>
    /// Marks opportunity as Lost. Valid from: Any non-terminal state
    /// </summary>
    public Result Lose(string reason, string? competitorLostTo = null)
    {
        if (!CanTransition(Status, OpportunityStatus.Lost))
            return Result.Failure($"Cannot transition from {Status} to Lost");

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Failure("Loss reason is required");

        Status = OpportunityStatus.Lost;
        Probability = 0m;
        ActualCloseDate = DateTime.UtcNow;
        LossReason = reason;
        CompetitorLostTo = competitorLostTo;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new OpportunityLostEvent(Id, LossReason, CompetitorLostTo));
        return Result.Success();
    }

    // ========== Value & Probability Updates ==========

    /// <summary>
    /// Updates opportunity value.
    /// </summary>
    public void UpdateValue(Money newValue)
    {
        Value = newValue;
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new OpportunityValueUpdatedEvent(Id, newValue));
    }

    /// <summary>
    /// Updates win probability (0-100%).
    /// </summary>
    public void UpdateProbability(decimal newProbability)
    {
        if (newProbability < 0 || newProbability > 100)
            throw new DomainException("Probability must be between 0 and 100");

        Probability = newProbability;
        UpdatedAt = DateTime.UtcNow;
    }

    // ========== Activity, Notes & Tasks Management ==========

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
        UpdatedAt = DateTime.UtcNow;
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

        _notes.Add(content);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Adds CRM task with SLA.
    /// </summary>
    public void AddTask(string description, DateTime dueDate, UserId? assignedTo = null)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Task description cannot be empty");

        var task = new CrmTask(
            id: CrmTaskId.New(),
            description: description,
            dueDate: dueDate,
            assignedTo: assignedTo,
            createdAt: DateTime.UtcNow
        );

        _tasks.Add(task);
        UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Marks task as completed.
    /// </summary>
    public void CompleteTask(CrmTaskId taskId)
    {
        var task = _tasks.FirstOrDefault(t => t.Id == taskId);
        if (task is null)
            throw new DomainException($"Task {taskId} not found");

        task.Complete();
        UpdatedAt = DateTime.UtcNow;
    }

    // ========== Assignment ==========

    /// <summary>
    /// Assigns opportunity to a user.
    /// </summary>
    public void Assign(UserId userId)
    {
        AssignedTo = userId;
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new OpportunityAssignedEvent(Id, userId));
    }

    // ========== FSM Validation ==========

    /// <summary>
    /// Validates if a state transition is allowed.
    /// </summary>
    private bool CanTransition(OpportunityStatus from, OpportunityStatus to)
    {
        return (from, to) switch
        {
            // From Open
            (OpportunityStatus.Open, OpportunityStatus.NeedsAnalysis) => true,
            (OpportunityStatus.Open, OpportunityStatus.Lost) => true,

            // From NeedsAnalysis
            (OpportunityStatus.NeedsAnalysis, OpportunityStatus.Proposal) => true,
            (OpportunityStatus.NeedsAnalysis, OpportunityStatus.Lost) => true,

            // From Proposal
            (OpportunityStatus.Proposal, OpportunityStatus.Quote) => true,
            (OpportunityStatus.Proposal, OpportunityStatus.Lost) => true,

            // From Quote
            (OpportunityStatus.Quote, OpportunityStatus.Negotiation) => true,
            (OpportunityStatus.Quote, OpportunityStatus.Lost) => true,

            // From Negotiation
            (OpportunityStatus.Negotiation, OpportunityStatus.Won) => true,
            (OpportunityStatus.Negotiation, OpportunityStatus.Lost) => true,

            // All other transitions are invalid
            _ => false
        };
    }
}

// ========== Supporting Value Objects & IDs ==========

public readonly record struct OpportunityId
{
    public Guid Value { get; }
    private OpportunityId(Guid value) => Value = value;
    public static OpportunityId New() => new(Guid.NewGuid());
    public static OpportunityId From(Guid value) => new(value);
}

public enum OpportunityPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}
