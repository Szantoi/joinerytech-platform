using Ardalis.Result;
using SpaceOS.Modules.CRM.Domain.Common;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.FSM;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Aggregates;

/// <summary>
/// Opportunity aggregate — represents a sales deal from initial contact through closure.
/// Can be created from converted Lead or directly.
/// Implements FSM-based state management (ADR-054, §2.2).
/// </summary>
public sealed class Opportunity : TenantScopedEntity
{
    private readonly List<Activity> _activities = [];
    private readonly List<CrmTask> _tasks = [];

    public OpportunityStatus Status { get; private set; }
    public Guid? LeadId { get; private set; }
    public Guid CustomerId { get; private set; }
    public ContactInfo ContactInfo { get; private set; } = default!;
    public string Title { get; private set; } = default!;
    public Money EstimatedValue { get; private set; } = default!;
    public decimal Probability { get; private set; } // 0-100
    public DateTimeOffset? ExpectedCloseDate { get; private set; }
    public Guid AssignedTo { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public Guid CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public Guid? UpdatedBy { get; private set; }

    /// <summary>If won, references the resulting Order.</summary>
    public Guid? OrderId { get; private set; }

    /// <summary>If converted to Quote, references it.</summary>
    public Guid? QuoteId { get; private set; }

    /// <summary>If lost, reason provided.</summary>
    public string? LossReason { get; private set; }

    /// <summary>If lost to competitor, store competitor name.</summary>
    public string? CompetitorName { get; private set; }

    /// <summary>Final value when won (may differ from estimate).</summary>
    public Money? FinalValue { get; private set; }

    public IReadOnlyList<Activity> Activities => _activities.AsReadOnly();
    public IReadOnlyList<CrmTask> Tasks => _tasks.AsReadOnly();

    private Opportunity() { }

    /// <summary>Factory method to create opportunity from converted lead.</summary>
    public static Result<Opportunity> CreateFromLead(
        Guid tenantId,
        Guid leadId,
        Guid customerId,
        ContactInfo contactInfo,
        string title,
        Money estimatedValue,
        DateTimeOffset? expectedCloseDate,
        Guid assignedTo,
        Guid createdBy)
    {
        var validationResult = ValidateCreation(tenantId, customerId, contactInfo, title, estimatedValue);
        if (!validationResult.IsSuccess)
            return validationResult;

        var opportunity = new Opportunity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            LeadId = leadId,
            CustomerId = customerId,
            ContactInfo = contactInfo,
            Title = title,
            EstimatedValue = estimatedValue,
            Probability = OpportunityStageProbability.For(OpportunityStatus.Open),
            ExpectedCloseDate = expectedCloseDate,
            AssignedTo = assignedTo,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow,
            Status = OpportunityStatus.Open
        };

        opportunity.RaiseDomainEvent(new OpportunityCreatedEvent
        {
            OpportunityId = opportunity.Id,
            LeadId = leadId,
            CustomerId = customerId,
            ContactInfo = contactInfo,
            EstimatedValue = estimatedValue,
            Title = title,
            AssignedTo = assignedTo,
            CreatedBy = createdBy
        });

        return Result.Success(opportunity);
    }

    /// <summary>Factory method to create opportunity directly (not from lead).</summary>
    public static Result<Opportunity> CreateDirect(
        Guid tenantId,
        Guid customerId,
        ContactInfo contactInfo,
        string title,
        Money estimatedValue,
        DateTimeOffset? expectedCloseDate,
        Guid assignedTo,
        Guid createdBy)
    {
        var validationResult = ValidateCreation(tenantId, customerId, contactInfo, title, estimatedValue);
        if (!validationResult.IsSuccess)
            return validationResult;

        var opportunity = new Opportunity
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            LeadId = null,
            CustomerId = customerId,
            ContactInfo = contactInfo,
            Title = title,
            EstimatedValue = estimatedValue,
            Probability = OpportunityStageProbability.For(OpportunityStatus.Open),
            ExpectedCloseDate = expectedCloseDate,
            AssignedTo = assignedTo,
            CreatedBy = createdBy,
            CreatedAt = DateTimeOffset.UtcNow,
            Status = OpportunityStatus.Open
        };

        opportunity.RaiseDomainEvent(new OpportunityCreatedEvent
        {
            OpportunityId = opportunity.Id,
            LeadId = null,
            CustomerId = customerId,
            ContactInfo = contactInfo,
            EstimatedValue = estimatedValue,
            Title = title,
            AssignedTo = assignedTo,
            CreatedBy = createdBy
        });

        return Result.Success(opportunity);
    }

    /// <summary>Move opportunity to NeedsAssessment phase.</summary>
    public Result StartNeedsAssessment(Guid actedBy)
    {
        if (!CanTransitionTo(OpportunityStatus.NeedsAssessment))
            return TransitionConflict(OpportunityStatus.NeedsAssessment);

        Status = OpportunityStatus.NeedsAssessment;
        Probability = OpportunityStageProbability.For(OpportunityStatus.NeedsAssessment);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new OpportunityNeedsAssessmentStartedEvent
        {
            OpportunityId = Id,
            StartedAt = DateTimeOffset.UtcNow,
            StartedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>Move opportunity to SolutionAssembly phase.</summary>
    public Result StartSolutionAssembly(Guid actedBy)
    {
        if (!CanTransitionTo(OpportunityStatus.SolutionAssembly))
            return TransitionConflict(OpportunityStatus.SolutionAssembly);

        Status = OpportunityStatus.SolutionAssembly;
        Probability = OpportunityStageProbability.For(OpportunityStatus.SolutionAssembly);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new OpportunitySolutionAssemblyStartedEvent
        {
            OpportunityId = Id,
            StartedAt = DateTimeOffset.UtcNow,
            StartedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>Send proposal/quote to customer.</summary>
    public Result SendProposal(Guid quoteId, Guid sentBy)
    {
        if (!CanTransitionTo(OpportunityStatus.Proposal))
            return TransitionConflict(OpportunityStatus.Proposal);

        Status = OpportunityStatus.Proposal;
        QuoteId = quoteId;
        Probability = OpportunityStageProbability.For(OpportunityStatus.Proposal);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = sentBy;

        RaiseDomainEvent(new OpportunityProposalSentEvent
        {
            OpportunityId = Id,
            QuoteId = quoteId,
            SentAt = DateTimeOffset.UtcNow,
            UpdatedProbability = Probability,
            SentBy = sentBy
        });

        return Result.Success();
    }

    /// <summary>Move opportunity to negotiation phase.</summary>
    public Result StartNegotiation(Guid actedBy)
    {
        if (!CanTransitionTo(OpportunityStatus.Negotiation))
            return TransitionConflict(OpportunityStatus.Negotiation);

        Status = OpportunityStatus.Negotiation;
        Probability = OpportunityStageProbability.For(OpportunityStatus.Negotiation);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = actedBy;

        RaiseDomainEvent(new OpportunityNegotiationStartedEvent
        {
            OpportunityId = Id,
            StartedAt = DateTimeOffset.UtcNow,
            UpdatedProbability = Probability,
            StartedBy = actedBy
        });

        return Result.Success();
    }

    /// <summary>Win opportunity and create order.</summary>
    public Result Win(Guid orderId, Money? finalValue, Guid wonBy)
    {
        if (!CanTransitionTo(OpportunityStatus.Won))
            return TransitionConflict(OpportunityStatus.Won);

        Status = OpportunityStatus.Won;
        OrderId = orderId;
        FinalValue = finalValue ?? EstimatedValue;
        Probability = OpportunityStageProbability.For(OpportunityStatus.Won);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = wonBy;

        RaiseDomainEvent(new OpportunityWonEvent
        {
            OpportunityId = Id,
            OrderId = orderId,
            FinalValue = FinalValue,
            WonAt = DateTimeOffset.UtcNow,
            WonBy = wonBy
        });

        return Result.Success();
    }

    /// <summary>Lose opportunity.</summary>
    public Result Lose(string? reason, string? competitorName, Guid lostBy)
    {
        if (!CanTransitionTo(OpportunityStatus.Lost))
            return TransitionConflict(OpportunityStatus.Lost);

        Status = OpportunityStatus.Lost;
        LossReason = reason;
        CompetitorName = competitorName;
        Probability = OpportunityStageProbability.For(OpportunityStatus.Lost);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = lostBy;

        RaiseDomainEvent(new OpportunityLostEvent
        {
            OpportunityId = Id,
            LossReason = reason,
            CompetitorName = competitorName,
            LostAt = DateTimeOffset.UtcNow,
            LostBy = lostBy
        });

        return Result.Success();
    }

    /// <summary>Abandon opportunity.</summary>
    public Result Abandon(string reason, Guid abandonedBy)
    {
        if (!CanTransitionTo(OpportunityStatus.Abandoned))
            return TransitionConflict(OpportunityStatus.Abandoned);

        if (string.IsNullOrWhiteSpace(reason))
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Abandonment reason is required"
            });

        Status = OpportunityStatus.Abandoned;
        Probability = OpportunityStageProbability.For(OpportunityStatus.Abandoned);
        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = abandonedBy;

        RaiseDomainEvent(new OpportunityAbandonedEvent
        {
            OpportunityId = Id,
            AbandonmentReason = reason,
            AbandonedAt = DateTimeOffset.UtcNow,
            AbandonedBy = abandonedBy
        });

        return Result.Success();
    }

    /// <summary>Update estimated value or probability.</summary>
    public Result UpdateEstimate(Money? newValue, decimal? newProbability, Guid updatedBy)
    {
        if (newValue is not null)
        {
            if (newValue.Amount <= 0)
                return Result.Invalid(new ValidationError
                {
                    ErrorMessage = "Estimated value must be positive"
                });
            EstimatedValue = newValue;
        }

        if (newProbability.HasValue)
        {
            if (newProbability < 0 || newProbability > 100)
                return Result.Invalid(new ValidationError
                {
                    ErrorMessage = "Probability must be between 0 and 100"
                });
            Probability = newProbability.Value;
        }

        UpdatedAt = DateTimeOffset.UtcNow;
        UpdatedBy = updatedBy;

        RaiseDomainEvent(new OpportunityEstimateUpdatedEvent
        {
            OpportunityId = Id,
            NewEstimatedValue = newValue,
            NewProbability = newProbability,
            UpdatedBy = updatedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Log an activity (call, email, meeting, note) on the opportunity.
    /// Mirrors <see cref="Lead.LogActivity"/> — the handlers called these three
    /// methods but the aggregate never declared them (CRM-BE-HOST).
    /// </summary>
    public Result LogActivity(string activityType, string description, Guid loggedBy)
    {
        if (string.IsNullOrWhiteSpace(activityType) || string.IsNullOrWhiteSpace(description))
            return Result.Invalid(new ValidationError
            {
                ErrorMessage = "Activity type and description are required"
            });

        _activities.Add(new Activity(activityType, description, loggedBy, DateTimeOffset.UtcNow));

        RaiseDomainEvent(new OpportunityActivityLoggedEvent
        {
            OpportunityId = Id,
            ActivityType = activityType,
            Description = description,
            LoggedBy = loggedBy,
            LoggedAt = DateTimeOffset.UtcNow
        });

        return Result.Success();
    }

    /// <summary>Create a task for the opportunity.</summary>
    public Result CreateTask(string title, DateTimeOffset dueDate, string priority, Guid createdBy)
    {
        if (string.IsNullOrWhiteSpace(title))
            return Result.Invalid(new ValidationError { ErrorMessage = "Task title is required" });

        if (dueDate < DateTimeOffset.UtcNow)
            return Result.Invalid(new ValidationError { ErrorMessage = "Due date must be in the future" });

        var task = new CrmTask(Guid.NewGuid(), title, dueDate, priority, createdBy);
        _tasks.Add(task);

        RaiseDomainEvent(new OpportunityTaskCreatedEvent
        {
            OpportunityId = Id,
            TaskId = task.Id,
            TaskTitle = title,
            DueDate = dueDate,
            Priority = priority,
            CreatedBy = createdBy
        });

        return Result.Success();
    }

    /// <summary>Mark one of the opportunity's tasks as completed.</summary>
    public Result CompleteTask(Guid taskId, Guid completedBy)
    {
        var task = _tasks.FirstOrDefault(t => t.Id == taskId);
        if (task == null)
            return Result.NotFound("Task not found");

        task.Complete();

        RaiseDomainEvent(new OpportunityTaskCompletedEvent
        {
            OpportunityId = Id,
            TaskId = taskId,
            CompletedBy = completedBy,
            CompletedAt = DateTimeOffset.UtcNow
        });

        return Result.Success();
    }

    /// <summary>Reassign opportunity to another user.</summary>
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

        RaiseDomainEvent(new OpportunityReassignedEvent
        {
            OpportunityId = Id,
            FromUserId = fromUserId,
            ToUserId = toUserId,
            ReassignedBy = reassignedBy
        });

        return Result.Success();
    }

    /// <summary>
    /// Check if transition to target status is allowed by FSM rules
    /// (single source of truth: <see cref="OpportunityStatusTransitions"/>).
    /// </summary>
    private bool CanTransitionTo(OpportunityStatus targetStatus)
        => OpportunityStatusTransitions.CanTransition(Status, targetStatus);

    /// <summary>
    /// Illegal FSM transition → <see cref="Result.Conflict(string[])"/> → HTTP 409
    /// (module error contract; payload guards stay Invalid → HTTP 400).
    /// </summary>
    private Result TransitionConflict(OpportunityStatus targetStatus)
        => Result.Conflict($"Cannot transition opportunity from {Status} to {targetStatus}");

    private static Result ValidateCreation(
        Guid tenantId,
        Guid customerId,
        ContactInfo contactInfo,
        string title,
        Money estimatedValue)
    {
        if (tenantId == Guid.Empty)
            return Result.Invalid(new ValidationError { ErrorMessage = "TenantId cannot be empty" });
        if (customerId == Guid.Empty)
            return Result.Invalid(new ValidationError { ErrorMessage = "CustomerId cannot be empty" });
        if (string.IsNullOrWhiteSpace(title))
            return Result.Invalid(new ValidationError { ErrorMessage = "Title is required" });
        if (estimatedValue.Amount <= 0)
            return Result.Invalid(new ValidationError { ErrorMessage = "EstimatedValue must be positive" });

        return Result.Success();
    }
}
