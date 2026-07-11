using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.Events;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Aggregates;

/// <summary>
/// WorkOrder aggregate root.
/// Represents a maintenance work order (corrective, preventive, or cleaning)
/// with FSM-enforced status transitions, assignment tracking, and parts management.
/// </summary>
public class WorkOrder : AggregateRoot
{
    private readonly List<WorkOrderPart> _parts = new();

    public WorkOrderId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public AssetId AssetId { get; private set; } = null!;
    public WorkOrderType Type { get; private set; }
    public WorkOrderPriority Priority { get; private set; }
    public WorkOrderStatus Status { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool RequiresDowntime { get; private set; }
    public DateTime? ScheduledAt { get; private set; }
    public decimal? EstimatedHours { get; private set; }
    public decimal? ActualHours { get; private set; }
    public AssignmentType? AssignmentType { get; private set; }
    public Guid? AssignedEmployeeId { get; private set; }
    public Guid? AssignedPartnerId { get; private set; }
    public DateTime ReportedAt { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? PostponementReason { get; private set; }
    public string? RejectionReason { get; private set; }
    public IReadOnlyList<WorkOrderPart> Parts => _parts.AsReadOnly();

    // EF Core constructor
    private WorkOrder() { }

    private WorkOrder(
        WorkOrderId id,
        Guid tenantId,
        AssetId assetId,
        WorkOrderType type,
        WorkOrderPriority priority,
        string title,
        string description,
        decimal? estimatedHours = null,
        bool requiresDowntime = false)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new DomainException("Work order title is required");
        if (title.Length > 200)
            throw new DomainException("Work order title must not exceed 200 characters");
        if (string.IsNullOrWhiteSpace(description))
            throw new DomainException("Work order description is required");
        if (description.Length > 2000)
            throw new DomainException("Work order description must not exceed 2000 characters");
        if (estimatedHours.HasValue && estimatedHours.Value <= 0)
            throw new DomainException("Estimated hours must be positive");

        Id = id;
        TenantId = tenantId;
        AssetId = assetId;
        Type = type;
        Priority = priority;
        Title = title;
        Description = description;
        EstimatedHours = estimatedHours;
        RequiresDowntime = requiresDowntime;
        Status = WorkOrderStatus.Reported;
        ReportedAt = DateTime.UtcNow;

        AddDomainEvent(new WorkOrderReportedEvent(
            Id,
            TenantId,
            AssetId,
            Type,
            Priority,
            Title));
    }

    /// <summary>
    /// Factory method to create a new work order.
    /// </summary>
    public static WorkOrder Create(
        Guid tenantId,
        AssetId assetId,
        WorkOrderType type,
        WorkOrderPriority priority,
        string title,
        string description,
        decimal? estimatedHours = null,
        bool requiresDowntime = false)
    {
        return new WorkOrder(
            WorkOrderId.New(),
            tenantId,
            assetId,
            type,
            priority,
            title,
            description,
            estimatedHours,
            requiresDowntime);
    }

    /// <summary>
    /// Schedules the work order (FSM: Reported → Scheduled).
    /// </summary>
    public void Schedule(DateTime scheduledAt, decimal estimatedHours)
    {
        if (Status != WorkOrderStatus.Reported)
            throw new DomainException($"Cannot schedule work order in {Status} status");

        if (scheduledAt <= DateTime.UtcNow)
            throw new DomainException("Scheduled date must be in the future");

        if (estimatedHours <= 0)
            throw new DomainException("Estimated hours must be positive");

        Status = WorkOrderStatus.Scheduled;
        ScheduledAt = scheduledAt;
        EstimatedHours = estimatedHours;

        AddDomainEvent(new WorkOrderScheduledEvent(
            Id,
            TenantId,
            scheduledAt,
            estimatedHours));
    }

    /// <summary>
    /// Assigns an internal technician to the work order (allowed in Reported/Scheduled).
    /// </summary>
    public void AssignInternalTechnician(Guid employeeId)
    {
        if (Status != WorkOrderStatus.Reported && Status != WorkOrderStatus.Scheduled)
            throw new DomainException($"Cannot assign technician in {Status} status");

        if (employeeId == Guid.Empty)
            throw new DomainException("EmployeeId is required");

        AssignmentType = Enums.AssignmentType.Internal;
        AssignedEmployeeId = employeeId;
        AssignedPartnerId = null;

        AddDomainEvent(new WorkOrderAssignedEvent(
            Id,
            TenantId,
            Enums.AssignmentType.Internal,
            employeeId,
            null));
    }

    /// <summary>
    /// Assigns an external contractor to the work order (allowed in Reported/Scheduled).
    /// </summary>
    public void AssignExternalContractor(Guid partnerId)
    {
        if (Status != WorkOrderStatus.Reported && Status != WorkOrderStatus.Scheduled)
            throw new DomainException($"Cannot assign contractor in {Status} status");

        if (partnerId == Guid.Empty)
            throw new DomainException("PartnerId is required");

        AssignmentType = Enums.AssignmentType.External;
        AssignedPartnerId = partnerId;
        AssignedEmployeeId = null;

        AddDomainEvent(new WorkOrderAssignedEvent(
            Id,
            TenantId,
            Enums.AssignmentType.External,
            null,
            partnerId));
    }

    /// <summary>
    /// Starts work on the work order (FSM: Scheduled → InProgress, requires assignment).
    /// </summary>
    public void StartWork()
    {
        if (Status != WorkOrderStatus.Scheduled)
            throw new DomainException($"Cannot start work in {Status} status, must be Scheduled first");

        if (!AssignmentType.HasValue)
            throw new DomainException("Work order must be assigned before starting");

        Status = WorkOrderStatus.InProgress;
        StartedAt = DateTime.UtcNow;

        AddDomainEvent(new WorkOrderStartedEvent(
            Id,
            TenantId,
            AssetId,
            Type,
            RequiresDowntime));
    }

    /// <summary>
    /// Completes the work order (FSM: InProgress → Completed).
    /// </summary>
    public void Complete(decimal actualHours)
    {
        if (Status != WorkOrderStatus.InProgress)
            throw new DomainException($"Cannot complete work order in {Status} status");

        if (actualHours <= 0)
            throw new DomainException("Actual hours must be positive");

        Status = WorkOrderStatus.Completed;
        ActualHours = actualHours;
        CompletedAt = DateTime.UtcNow;

        AddDomainEvent(new WorkOrderCompletedEvent(
            Id,
            TenantId,
            actualHours));
    }

    /// <summary>
    /// Postpones the work order (FSM: InProgress/Scheduled → Postponed).
    /// </summary>
    public void Postpone(string reason)
    {
        if (Status != WorkOrderStatus.InProgress && Status != WorkOrderStatus.Scheduled)
            throw new DomainException($"Cannot postpone work order in {Status} status");

        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("Postponement reason is required");

        Status = WorkOrderStatus.Postponed;
        PostponementReason = reason;

        AddDomainEvent(new WorkOrderPostponedEvent(
            Id,
            TenantId,
            reason));
    }

    /// <summary>
    /// Rejects the work order (FSM: Reported/Scheduled → Rejected).
    /// </summary>
    public void Reject(string reason)
    {
        if (Status != WorkOrderStatus.Reported && Status != WorkOrderStatus.Scheduled)
            throw new DomainException($"Cannot reject work order in {Status} status");

        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("Rejection reason is required");

        Status = WorkOrderStatus.Rejected;
        RejectionReason = reason;

        AddDomainEvent(new WorkOrderRejectedEvent(
            Id,
            TenantId,
            reason));
    }

    /// <summary>
    /// Reopens a postponed or rejected work order (FSM: Postponed/Rejected → Reported).
    /// </summary>
    public void Reopen()
    {
        if (Status != WorkOrderStatus.Postponed && Status != WorkOrderStatus.Rejected)
            throw new DomainException($"Cannot reopen work order in {Status} status");

        Status = WorkOrderStatus.Reported;
        PostponementReason = null;
        RejectionReason = null;
        AssignmentType = null;
        AssignedEmployeeId = null;
        AssignedPartnerId = null;
        ScheduledAt = null;
        StartedAt = null;

        AddDomainEvent(new WorkOrderReopenedEvent(
            Id,
            TenantId));
    }

    /// <summary>
    /// Adds a spare part to the work order (blocked if Completed).
    /// </summary>
    public void AddPart(string catalogCode, int quantity, Money unitPrice)
    {
        if (Status == WorkOrderStatus.Completed)
            throw new DomainException("Cannot add parts to completed work orders");

        if (string.IsNullOrWhiteSpace(catalogCode))
            throw new DomainException("Catalog code is required");

        if (quantity <= 0)
            throw new DomainException("Quantity must be positive");

        if (!unitPrice.IsPositive)
            throw new DomainException("Unit price must be positive");

        var part = WorkOrderPart.Create(catalogCode, quantity, unitPrice);
        _parts.Add(part);

        AddDomainEvent(new WorkOrderPartAddedEvent(
            Id,
            TenantId,
            part.Id,
            catalogCode,
            quantity));
    }

    /// <summary>
    /// Removes a part from the work order (blocked if Completed).
    /// </summary>
    public void RemovePart(string partId)
    {
        if (Status == WorkOrderStatus.Completed)
            throw new DomainException("Cannot remove parts from completed work orders");

        if (string.IsNullOrWhiteSpace(partId))
            throw new DomainException("Part ID is required");

        var part = _parts.FirstOrDefault(p => p.Id == partId);
        if (part == null)
            throw new DomainException($"Part with ID '{partId}' not found");

        _parts.Remove(part);

        AddDomainEvent(new WorkOrderPartRemovedEvent(
            Id,
            TenantId,
            partId));
    }
}
