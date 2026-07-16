using Ardalis.Result;
using SpaceOS.Modules.CRM.Domain.Common;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.FSM;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Aggregates;

/// <summary>
/// Lead aggregate — represents a prospect from initial contact to opportunity conversion.
/// Implements FSM-based state management (ADR-054, §2.1).
/// </summary>
public sealed class Lead : TenantScopedEntity
{
    private readonly List<Activity> _activities = [];
    private readonly List<CrmTask> _tasks = [];

    public LeadStatus Status { get; private set; }
    public ContactInfo ContactInfo { get; private set; } = default!;
    public LeadSource Source { get; private set; }
    public Guid AssignedTo { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public Guid? UpdatedBy { get; private set; }

    /// <summary>If converted, references the resulting Opportunity.</summary>
    public Guid? OpportunityRef { get; private set; }

    public IReadOnlyList<Activity> Activities => _activities.AsReadOnly();
    public IReadOnlyList<CrmTask> Tasks => _tasks.AsReadOnly();

    /// <summary>Private ctor for EF Core.</summary>
    private Lead() { }

    /// <summary>Factory method to create a new lead.</summary>
    public static Result<Lead> Create(
        Guid tenantId,
        ContactInfo contactInfo,
        LeadSource source,
        Guid assignedTo,
        Guid createdBy)
    {
        if (tenantId == Guid.Empty)
            return Result.Invalid(new ValidationError { ErrorMessage = "TenantId cannot be empty" });
        if (assignedTo == Guid.Empty)
            return Result.Invalid(new ValidationError { ErrorMessage = "AssignedTo cannot be empty" });
        if (createdBy == Guid.Empty)
            return Result.Invalid(new ValidationError { ErrorMessage = "CreatedBy cannot be empty" });

        var lead = new Lead
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            ContactInfo = contactInfo,
            Source = source,
            AssignedTo = assignedTo,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow,
            Status = LeadStatus.New
        };

        lead.RaiseDomainEvent(new LeadCreatedEvent
        {
            LeadId = lead.Id,
            ContactInfo = contactInfo,
            Source = source,
            AssignedTo = assignedTo,
            CreatedBy = createdBy
        });

        return Result.Success(lead);
    }

    /// <summary>
    /// Transition lead to Contacted status.
    /// Valid only from New status.
    /// </summary>
    public Result Contact(string? notes, Guid actedBy)
    {
        if (!CanTransitionTo(LeadStatus.Contacted))
            return TransitionConflict(LeadStatus.Contacted);

        Status = LeadStatus.Contacted;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new LeadContactedEvent
        {
            LeadId = Id,
            ContactedAt = DateTimeOffset.UtcNow,
            Notes = notes,
            ActedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Transition lead to Qualified status.
    /// Valid only from Contacted status.
    /// </summary>
    public Result Qualify(string? qualificationNotes, Guid actedBy)
    {
        if (!CanTransitionTo(LeadStatus.Qualified))
            return TransitionConflict(LeadStatus.Qualified);

        Status = LeadStatus.Qualified;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new LeadQualifiedEvent
        {
            LeadId = Id,
            QualifiedAt = DateTimeOffset.UtcNow,
            QualificationNotes = qualificationNotes,
            ActedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Transition lead to Nurturing status (wire: "nurture" — minosites → nurturing).
    /// Optional parking state for a qualified lead that is not yet ready to buy;
    /// conversion stays available from here (LeadStatusTransitions).
    /// </summary>
    public Result Nurture(string? notes, Guid actedBy)
    {
        if (!CanTransitionTo(LeadStatus.Nurturing))
            return TransitionConflict(LeadStatus.Nurturing);

        Status = LeadStatus.Nurturing;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new LeadNurturingStartedEvent
        {
            LeadId = Id,
            StartedAt = DateTimeOffset.UtcNow,
            Notes = notes,
            ActedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Transition lead to Disqualified status (wire: "discard").
    /// Valid from any open state (New, Contacted, Qualified, Nurturing).
    /// </summary>
    public Result Disqualify(string reason, Guid actedBy)
    {
        if (!CanTransitionTo(LeadStatus.Disqualified))
            return TransitionConflict(LeadStatus.Disqualified);

        // Payload guard (not an FSM violation) → Invalid → HTTP 400.
        if (string.IsNullOrWhiteSpace(reason))
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Disqualification reason is required"
            });

        Status = LeadStatus.Disqualified;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new LeadDisqualifiedEvent
        {
            LeadId = Id,
            DisqualificationReason = reason,
            DisqualifiedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Convert lead to opportunity (wire: "convert").
    /// Valid from Qualified (directly) or Nurturing (LeadStatusTransitions).
    /// </summary>
    public Result ConvertToOpportunity(Guid opportunityId, Guid customerId, Guid convertedBy)
    {
        if (!CanTransitionTo(LeadStatus.Opportunity))
            return TransitionConflict(LeadStatus.Opportunity);

        // Payload guard (not an FSM violation) → Invalid → HTTP 400.
        if (opportunityId == Guid.Empty)
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "OpportunityId cannot be empty"
            });

        Status = LeadStatus.Opportunity;
        OpportunityRef = opportunityId;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = convertedBy;

        RaiseDomainEvent(new LeadConvertedToOpportunityEvent
        {
            LeadId = Id,
            OpportunityId = opportunityId,
            CustomerId = customerId,
            ConvertedBy = convertedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Reassign lead to another user.
    /// </summary>
    public Result Reassign(Guid toUserId, Guid reassignedBy)
    {
        if (toUserId == Guid.Empty)
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "ToUserId cannot be empty"
            });

        var fromUserId = AssignedTo;
        AssignedTo = toUserId;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = reassignedBy;

        RaiseDomainEvent(new LeadReassignedEvent
        {
            LeadId = Id,
            FromUserId = fromUserId,
            ToUserId = toUserId,
            ReassignedBy = reassignedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Log an activity (call, email, meeting, note) on the lead.
    /// </summary>
    public Result LogActivity(string activityType, string description, Guid loggedBy)
    {
        if (string.IsNullOrWhiteSpace(activityType) || string.IsNullOrWhiteSpace(description))
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Activity type and description are required"
            });

        var activity = new Activity(activityType, description, loggedBy, DateTimeOffset.UtcNow);
        _activities.Add(activity);

        RaiseDomainEvent(new LeadActivityLoggedEvent
        {
            LeadId = Id,
            ActivityType = activityType,
            Description = description,
            LoggedBy = loggedBy,
            LoggedAt = DateTimeOffset.UtcNow
        });

        return Result.Success();
    }

    /// <summary>
    /// Create a task for the lead.
    /// </summary>
    public Result CreateTask(string title, DateTimeOffset dueDate, string priority, Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(title))
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Task title is required"
            });

        if (dueDate < DateTimeOffset.UtcNow)
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Due date must be in the future"
            });

        var task = new CrmTask(Guid.NewGuid(), title, dueDate, priority, createdBy);
        _tasks.Add(task);

        RaiseDomainEvent(new LeadTaskCreatedEvent
        {
            LeadId = Id,
            TaskId = task.Id,
            TaskTitle = title,
            DueDate = dueDate,
            Priority = priority,
            CreatedBy = createdBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Mark a task as completed.
    /// </summary>
    public Result CompleteTask(Guid taskId, Guid completedBy)
    {
        var task = _tasks.FirstOrDefault(t => t.Id == taskId);
        if (task == null)
            return Result.NotFound("Task not found");

        task.Complete();

        RaiseDomainEvent(new LeadTaskCompletedEvent
        {
            LeadId = Id,
            TaskId = taskId,
            CompletedBy = completedBy,
            CompletedAt = DateTimeOffset.UtcNow
        });

        return Result.Success();
    }

    /// <summary>
    /// Update contact information.
    /// </summary>
    public Result UpdateContactInfo(ContactInfo newContactInfo, Guid updatedBy)
    {
        ContactInfo = newContactInfo;
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = updatedBy;

        RaiseDomainEvent(new LeadContactInfoUpdatedEvent
        {
            LeadId = Id,
            NewContactInfo = newContactInfo,
            UpdatedBy = updatedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Soft-delete guard: a lead may only be removed while it is still New, or once
    /// it has been Disqualified — a lead that was contacted, qualified, nurtured or
    /// converted carries history that must be retained (rule documented on
    /// <c>DeleteLeadCommand</c>; the aggregate method it called never existed, so
    /// the module did not compile — added by CRM-BE-HOST).
    /// </summary>
    public Result Delete(Guid deletedBy)
    {
        if (Status is not (LeadStatus.New or LeadStatus.Disqualified))
            return Result.Conflict(
                $"Cannot delete a lead in {Status} status (only New or Disqualified may be deleted)");

        RaiseDomainEvent(new LeadDeletedEvent
        {
            LeadId = Id,
            DeletedAt = DateTimeOffset.UtcNow,
            DeletedBy = deletedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Check if transition to target status is allowed by FSM rules
    /// (single source of truth: <see cref="LeadStatusTransitions"/>).
    /// </summary>
    private bool CanTransitionTo(LeadStatus targetStatus)
        => LeadStatusTransitions.CanTransition(Status, targetStatus);

    /// <summary>
    /// Illegal FSM transition → <see cref="Result.Conflict(string[])"/> → HTTP 409
    /// (module error contract; payload guards stay Invalid → HTTP 400).
    /// </summary>
    private Result TransitionConflict(LeadStatus targetStatus)
        => Result.Conflict($"Cannot transition lead from {Status} to {targetStatus}");
}

/// <summary>
/// Activity entity (child of Lead).
/// </summary>
public sealed class Activity
{
    public string Type { get; }
    public string Description { get; }
    public Guid CreatedBy { get; }
    public DateTimeOffset CreatedAt { get; }

    public Activity(string type, string description, Guid createdBy, DateTimeOffset createdAt)
    {
        Type = type ?? throw new ArgumentNullException(nameof(type));
        Description = description ?? throw new ArgumentNullException(nameof(description));
        CreatedBy = createdBy;
        CreatedAt = createdAt;
    }
}

/// <summary>
/// Task entity (child of Lead/Opportunity).
///
/// Named CrmTask (not Task) to avoid the pervasive ambiguity with
/// System.Threading.Tasks.Task — which is what kept the repository interfaces
/// trapped inside the handler files. Also matches the portal vocabulary
/// (modules/crm/services/tasks.ts — CrmTask).
/// </summary>
public sealed class CrmTask
{
    public Guid Id { get; }
    public string Title { get; }
    public DateTimeOffset DueDate { get; }
    public string Priority { get; }
    public bool IsCompleted { get; private set; }
    public Guid CreatedBy { get; }
    public DateTimeOffset CreatedAt { get; }

    public CrmTask(Guid id, string title, DateTimeOffset dueDate, string priority, Guid createdBy)
    {
        Id = id;
        Title = title ?? throw new ArgumentNullException(nameof(title));
        DueDate = dueDate;
        Priority = priority ?? "medium";
        CreatedBy = createdBy;
        CreatedAt = DateTimeOffset.UtcNow;
        IsCompleted = false;
    }

    public void Complete() => IsCompleted = true;
}
