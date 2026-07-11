using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.QA.Domain.Enums;
using SpaceOS.Modules.QA.Domain.Events;
using SpaceOS.Modules.QA.Domain.FSM;
using SpaceOS.Modules.QA.Domain.StrongIds;
using SpaceOS.Modules.QA.Domain.ValueObjects;

namespace SpaceOS.Modules.QA.Domain.Aggregates;

/// <summary>
/// Ticket aggregate root.
/// Represents a quality issue ticket (warranty, repair, missing parts, damage)
/// with FSM-enforced status transitions and resolution tracking.
/// </summary>
public class Ticket : AggregateRoot
{
    private readonly List<ResolutionAction> _resolutionActions = new();

    public TicketId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public TicketType TicketType { get; private set; }
    public TicketStatus Status { get; private set; }
    public CrmTaskPriority Priority { get; private set; }
    public Guid? OrderId { get; private set; }
    public Guid? ProductId { get; private set; }
    public Guid? InspectionId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid ReportedBy { get; private set; }
    public Guid? AssignedTo { get; private set; }
    public string? ResolutionNotes { get; private set; }
    public IReadOnlyList<ResolutionAction> ResolutionActions => _resolutionActions.AsReadOnly();
    public DateTime ReportedAt { get; private set; }
    public DateTime? AssignedAt { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? ResolvedAt { get; private set; }

    // EF Core constructor
    private Ticket() { }

    private Ticket(
        TicketId id,
        Guid tenantId,
        TicketType ticketType,
        CrmTaskPriority priority,
        string title,
        string description,
        Guid reportedBy,
        Guid? orderId = null,
        Guid? productId = null,
        Guid? inspectionId = null)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Ticket title is required");
        if (title.Length < 5 || title.Length > 200)
            throw new DomainException("Ticket title must be between 5 and 200 characters");
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Ticket description is required");
        if (description.Length < 10)
            throw new DomainException("Ticket description must be at least 10 characters");
        if (reportedBy == Guid.Empty)
            throw new DomainException("ReportedBy is required");

        Id = id;
        TenantId = tenantId;
        TicketType = ticketType;
        Priority = priority;
        Title = title;
        Description = description;
        ReportedBy = reportedBy;
        OrderId = orderId;
        ProductId = productId;
        InspectionId = inspectionId;
        Status = TicketStatus.Reported;
        ReportedAt = DateTime.UtcNow;

        AddDomainEvent(new TicketReportedEvent(
            Id,
            TenantId,
            TicketType,
            Title,
            Priority,
            ReportedBy));
    }

    /// <summary>
    /// Factory method to create a new ticket.
    /// </summary>
    public static Ticket Create(
        Guid tenantId,
        TicketType ticketType,
        CrmTaskPriority priority,
        string title,
        string description,
        Guid reportedBy,
        Guid? orderId = null,
        Guid? productId = null,
        Guid? inspectionId = null)
    {
        return new Ticket(
            TicketId.New(),
            tenantId,
            ticketType,
            priority,
            title,
            description,
            reportedBy,
            orderId,
            productId,
            inspectionId);
    }

    /// <summary>
    /// Assigns the ticket to a user (FSM: Reported → Assigned).
    /// </summary>
    public void Assign(Guid assigneeId)
    {
        if (!TicketStatusTransitions.IsValidTransition(Status, TicketStatus.Assigned))
            throw new DomainException($"Cannot transition from {Status} to Assigned");

        if (assigneeId == Guid.Empty)
            throw new DomainException("AssigneeId is required");

        AssignedTo = assigneeId;
        Status = TicketStatus.Assigned;
        AssignedAt = DateTime.UtcNow;

        AddDomainEvent(new TicketAssignedEvent(
            Id,
            TenantId,
            assigneeId));
    }

    /// <summary>
    /// Starts work on the ticket (FSM: Assigned → InProgress).
    /// </summary>
    public void Start()
    {
        if (!TicketStatusTransitions.IsValidTransition(Status, TicketStatus.InProgress))
            throw new DomainException($"Cannot transition from {Status} to InProgress");

        Status = TicketStatus.InProgress;
        StartedAt = DateTime.UtcNow;

        AddDomainEvent(new TicketStartedEvent(
            Id,
            TenantId,
            AssignedTo!.Value));
    }

    /// <summary>
    /// Resolves the ticket with resolution actions (FSM: InProgress → Resolved).
    /// </summary>
    public void Resolve(List<ResolutionAction> resolutionActions, string? resolutionNotes = null)
    {
        if (!TicketStatusTransitions.IsValidTransition(Status, TicketStatus.Resolved))
            throw new DomainException($"Cannot transition from {Status} to Resolved");

        if (resolutionActions == null || !resolutionActions.Any())
            throw new DomainException("At least one resolution action is required");

        _resolutionActions.AddRange(resolutionActions);
        ResolutionNotes = resolutionNotes;
        Status = TicketStatus.Resolved;
        ResolvedAt = DateTime.UtcNow;

        AddDomainEvent(new TicketResolvedEvent(
            Id,
            TenantId,
            AssignedTo!.Value,
            resolutionActions.Select(a => a.ActionType).ToList()));
    }

    /// <summary>
    /// Rejects the ticket (FSM: InProgress → Rejected).
    /// </summary>
    public void Reject(string reason)
    {
        if (!TicketStatusTransitions.IsValidTransition(Status, TicketStatus.Rejected))
            throw new DomainException($"Cannot transition from {Status} to Rejected");

        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("Rejection reason is required");

        ResolutionNotes = reason;
        Status = TicketStatus.Rejected;

        AddDomainEvent(new TicketRejectedEvent(
            Id,
            TenantId,
            reason));
    }

    /// <summary>
    /// Reopens a rejected ticket (FSM: Rejected → Reported).
    /// </summary>
    public void Reopen()
    {
        if (!TicketStatusTransitions.IsValidTransition(Status, TicketStatus.Reported))
            throw new DomainException($"Cannot transition from {Status} to Reported");

        Status = TicketStatus.Reported;
        AssignedTo = null;
        AssignedAt = null;
        StartedAt = null;
        ResolutionNotes = null;

        AddDomainEvent(new TicketReopenedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Escalates ticket priority (domain business rule based on age).
    /// </summary>
    public void EscalatePriority(CrmTaskPriority newPriority)
    {
        if (newPriority <= Priority)
            throw new DomainException("New priority must be higher than current priority");

        if (TicketStatusTransitions.IsTerminalState(Status))
            throw new DomainException("Cannot escalate resolved tickets");

        var oldPriority = Priority;
        Priority = newPriority;

        AddDomainEvent(new TicketPriorityEscalatedEvent(
            Id,
            TenantId,
            oldPriority,
            newPriority));
    }

    /// <summary>
    /// Updates ticket description (allowed before resolution).
    /// </summary>
    public void UpdateDescription(string description)
    {
        if (TicketStatusTransitions.IsTerminalState(Status))
            throw new DomainException("Cannot update description of resolved tickets");

        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Description is required");
        if (description.Length < 10)
            throw new DomainException("Description must be at least 10 characters");

        Description = description;
    }

    /// <summary>
    /// Adds a resolution action to an in-progress ticket.
    /// </summary>
    public void AddResolutionAction(ActionType actionType, string description, decimal? costAmount = null)
    {
        if (Status != TicketStatus.InProgress)
            throw new DomainException("Can only add resolution actions to in-progress tickets");

        var cost = costAmount.HasValue
            ? Money.Create(costAmount.Value, "HUF")
            : Money.Zero("HUF");

        var action = ResolutionAction.Create(actionType, description, cost);
        _resolutionActions.Add(action);
    }
}
