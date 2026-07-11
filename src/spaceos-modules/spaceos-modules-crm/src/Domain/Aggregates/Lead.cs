using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.CRM.Domain.Entities;
using SpaceOS.Modules.CRM.Domain.Enums;
using SpaceOS.Modules.CRM.Domain.Events;
using SpaceOS.Modules.CRM.Domain.ValueObjects;

namespace SpaceOS.Modules.CRM.Domain.Aggregates;

/// <summary>
/// Lead aggregate root - manages prospect lifecycle from initial contact to conversion
/// FSM States: New → Contacted → Qualified → {Disqualified | ConvertedToOpportunity}
/// </summary>
public class Lead : AggregateRoot
{
    private readonly List<Activity> _activities = new();
    private readonly List<CrmTask> _tasks = new();

    public Guid Id { get; private set; }
    public LeadState Status { get; private set; }
    public LeadSource Source { get; private set; }
    public ContactInfo ContactInfo { get; private set; } = null!;
    public Guid AssignedTo { get; private set; }
    public Guid? OpportunityRef { get; private set; } // Immutable once set
    public string? DisqualificationReason { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public Guid TenantId { get; private set; }

    public IReadOnlyCollection<Activity> Activities => _activities.AsReadOnly();
    public IReadOnlyCollection<CrmTask> Tasks => _tasks.AsReadOnly();

    private Lead() { } // EF Core

    /// <summary>
    /// Create a new Lead in New status
    /// </summary>
    public static Lead Create(
        ContactInfo contactInfo,
        LeadSource source,
        Guid assignedTo,
        Guid tenantId)
    {
        if (contactInfo == null)
            throw new ArgumentNullException(nameof(contactInfo));

        if (assignedTo == Guid.Empty)
            throw new ArgumentException("AssignedTo user is required", nameof(assignedTo));

        if (tenantId == Guid.Empty)
            throw new ArgumentException("TenantId is required", nameof(tenantId));

        var lead = new Lead
        {
            Id = Guid.NewGuid(),
            Status = LeadState.New,
            Source = source,
            ContactInfo = contactInfo,
            AssignedTo = assignedTo,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow
        };

        lead.AddDomainEvent(new LeadCreatedEvent(
            lead.Id,
            lead.TenantId,
            lead.ContactInfo.Name));

        return lead;
    }

    /// <summary>
    /// FSM Transition: New → Contacted
    /// </summary>
    public void Contact()
    {
        if (Status != LeadState.New)
            throw new InvalidOperationException($"Cannot contact lead in status {Status}. Must be New.");

        Status = LeadState.Contacted;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadContactedEvent(Id, TenantId));
    }

    /// <summary>
    /// FSM Transition: Contacted → Qualified
    /// Requires at least 1 activity logged
    /// </summary>
    public void Qualify()
    {
        if (Status != LeadState.Contacted)
            throw new InvalidOperationException($"Cannot qualify lead in status {Status}. Must be Contacted.");

        if (_activities.Count == 0)
            throw new InvalidOperationException("Cannot qualify lead without any activities logged.");

        Status = LeadState.Qualified;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadQualifiedEvent(Id, TenantId));
    }

    /// <summary>
    /// FSM Transition: {New | Contacted} → Disqualified
    /// </summary>
    public void Disqualify(string reason)
    {
        if (Status != LeadState.New && Status != LeadState.Contacted)
            throw new InvalidOperationException($"Cannot disqualify lead in status {Status}. Must be New or Contacted.");

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Disqualification reason is required", nameof(reason));

        Status = LeadState.Disqualified;
        DisqualificationReason = reason;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadDisqualifiedEvent(Id, TenantId));
    }

    /// <summary>
    /// FSM Transition: Qualified → ConvertedToOpportunity
    /// Creates and returns Opportunity aggregate
    /// </summary>
    public Opportunity ConvertToOpportunity(Money estimatedValue)
    {
        if (Status != LeadState.Qualified)
            throw new InvalidOperationException($"Cannot convert lead in status {Status}. Must be Qualified.");

        if (estimatedValue == null)
            throw new ArgumentNullException(nameof(estimatedValue));

        var opportunity = Opportunity.CreateFromLead(
            this.Id,
            this.ContactInfo,
            estimatedValue,
            this.AssignedTo,
            this.TenantId);

        Status = LeadState.ConvertedToOpportunity;
        OpportunityRef = opportunity.Id;
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadConvertedToOpportunityEvent(Id, TenantId));

        return opportunity;
    }

    /// <summary>
    /// Add activity (logged interaction)
    /// </summary>
    public Guid AddActivity(ActivityType type, string description, Guid createdBy)
    {
        var activity = Activity.Log(type, description, createdBy);
        _activities.Add(activity);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadActivityAddedEvent(Id, TenantId));

        return activity.Id;
    }

    /// <summary>
    /// Add follow-up task
    /// </summary>
    public Guid AddTask(string title, DateTime dueDate, CrmTaskPriority priority, Guid createdBy)
    {
        var task = CrmTask.Create(title, dueDate, priority, createdBy);
        _tasks.Add(task);
        UpdatedAt = DateTime.UtcNow;

        AddDomainEvent(new LeadTaskAddedEvent(Id, TenantId));

        return task.Id;
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

        AddDomainEvent(new LeadTaskCompletedEvent(Id, TenantId));
    }
}
