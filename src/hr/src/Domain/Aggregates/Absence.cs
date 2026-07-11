using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.Events;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Aggregates;

/// <summary>
/// Absence aggregate root.
/// Represents an employee absence request with FSM-enforced status transitions.
/// </summary>
public class Absence : AggregateRoot
{
    public AbsenceId Id { get; private set; } = null!;
    public Guid TenantId { get; private set; }
    public EmployeeId EmployeeId { get; private set; } = null!;
    public AbsenceType Type { get; private set; }
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public int WorkDays { get; private set; }
    public AbsenceStatus Status { get; private set; }
    public string Reason { get; private set; } = string.Empty;
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public Guid? RejectedByUserId { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }

    // EF Core constructor
    private Absence() { }

    private Absence(
        AbsenceId id,
        Guid tenantId,
        EmployeeId employeeId,
        AbsenceType type,
        DateOnly startDate,
        DateOnly endDate,
        string reason)
    {
        if (endDate < startDate)
            throw new DomainException("End date must be greater than or equal to start date");

        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException("Absence reason is required");
        if (reason.Length > 500)
            throw new DomainException("Absence reason must not exceed 500 characters");

        Id = id;
        TenantId = tenantId;
        EmployeeId = employeeId;
        Type = type;
        StartDate = startDate;
        EndDate = endDate;
        WorkDays = CalculateWorkDays(startDate, endDate);
        Reason = reason;
        Status = AbsenceStatus.Pending;

        AddDomainEvent(new AbsenceRequestedEvent(
            Id,
            TenantId,
            EmployeeId,
            Type,
            StartDate,
            EndDate,
            WorkDays));
    }

    /// <summary>
    /// Factory method to create a new absence request.
    /// </summary>
    public static Absence Create(
        Guid tenantId,
        EmployeeId employeeId,
        AbsenceType type,
        DateOnly startDate,
        DateOnly endDate,
        string reason)
    {
        return new Absence(
            AbsenceId.New(),
            tenantId,
            employeeId,
            type,
            startDate,
            endDate,
            reason);
    }

    /// <summary>
    /// Approves the absence request (FSM: Pending → Approved).
    /// </summary>
    public void Approve(Guid approvedBy)
    {
        if (Status != AbsenceStatus.Pending)
            throw new DomainException($"Cannot approve absence in {Status} status");

        if (approvedBy == Guid.Empty)
            throw new DomainException("ApprovedBy user ID is required");

        Status = AbsenceStatus.Approved;
        ApprovedByUserId = approvedBy;
        ApprovedAt = DateTime.UtcNow;

        AddDomainEvent(new AbsenceApprovedEvent(
            Id,
            TenantId,
            EmployeeId,
            approvedBy));
    }

    /// <summary>
    /// Rejects the absence request (FSM: Pending → Rejected).
    /// </summary>
    public void Reject(Guid rejectedBy, string rejectionReason)
    {
        if (Status != AbsenceStatus.Pending)
            throw new DomainException($"Cannot reject absence in {Status} status");

        if (rejectedBy == Guid.Empty)
            throw new DomainException("RejectedBy user ID is required");

        if (string.IsNullOrWhiteSpace(rejectionReason))
            throw new DomainException("Rejection reason is required");
        if (rejectionReason.Length > 500)
            throw new DomainException("Rejection reason must not exceed 500 characters");

        Status = AbsenceStatus.Rejected;
        RejectedByUserId = rejectedBy;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = rejectionReason;

        AddDomainEvent(new AbsenceRejectedEvent(
            Id,
            TenantId,
            EmployeeId,
            rejectedBy,
            rejectionReason));
    }

    /// <summary>
    /// Starts the absence period (FSM: Approved → InProgress).
    /// </summary>
    public void StartAbsence()
    {
        if (Status != AbsenceStatus.Approved)
            throw new DomainException($"Cannot start absence in {Status} status, must be Approved first");

        Status = AbsenceStatus.InProgress;

        AddDomainEvent(new AbsenceStartedEvent(
            Id,
            TenantId,
            EmployeeId));
    }

    /// <summary>
    /// Completes the absence period (FSM: InProgress → Completed).
    /// </summary>
    public void CompleteAbsence()
    {
        if (Status != AbsenceStatus.InProgress)
            throw new DomainException($"Cannot complete absence in {Status} status, must be InProgress first");

        Status = AbsenceStatus.Completed;

        AddDomainEvent(new AbsenceCompletedEvent(
            Id,
            TenantId,
            EmployeeId));
    }

    /// <summary>
    /// Reopens a rejected absence (FSM: Rejected → Pending).
    /// </summary>
    public void Reopen()
    {
        if (Status != AbsenceStatus.Rejected)
            throw new DomainException($"Cannot reopen absence in {Status} status, only Rejected absences can be reopened");

        Status = AbsenceStatus.Pending;
        RejectedByUserId = null;
        RejectedAt = null;
        RejectionReason = null;

        AddDomainEvent(new AbsenceReopenedEvent(
            Id,
            TenantId,
            EmployeeId));
    }

    /// <summary>
    /// Calculates work days excluding weekends (Sat/Sun).
    /// </summary>
    private static int CalculateWorkDays(DateOnly startDate, DateOnly endDate)
    {
        int workDays = 0;
        var current = startDate;

        while (current <= endDate)
        {
            if (current.DayOfWeek != DayOfWeek.Saturday && current.DayOfWeek != DayOfWeek.Sunday)
            {
                workDays++;
            }
            current = current.AddDays(1);
        }

        return workDays;
    }
}
