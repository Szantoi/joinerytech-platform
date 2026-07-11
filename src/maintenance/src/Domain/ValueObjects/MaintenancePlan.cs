using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Domain.ValueObjects;

/// <summary>
/// Maintenance plan value object
/// </summary>
public record MaintenancePlan
{
    public string Id { get; init; } = null!;
    public string Label { get; init; } = null!;
    public MaintenanceTrigger Trigger { get; init; }
    public int? IntervalDays { get; init; }
    public decimal? IntervalHours { get; init; }
    public decimal EstimatedHours { get; init; }
    public DateOnly? LastDone { get; init; }
    public decimal? LastDoneHours { get; init; }
    public AssignmentType AssigneeType { get; init; }
    public Guid? AssigneeEmployeeId { get; init; }

    private MaintenancePlan() { }

    public static MaintenancePlan CreateIntervalBased(
        string label,
        int intervalDays,
        decimal estimatedHours,
        AssignmentType assigneeType,
        Guid? assigneeEmployeeId = null,
        DateOnly? lastDone = null)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new DomainException("Label is required");
        if (intervalDays <= 0)
            throw new DomainException("IntervalDays must be positive");
        if (estimatedHours <= 0)
            throw new DomainException("EstimatedHours must be positive");
        if (assigneeType == AssignmentType.Internal && assigneeEmployeeId == null)
            throw new DomainException("AssigneeEmployeeId is required for internal assignments");

        return new MaintenancePlan
        {
            Id = Guid.NewGuid().ToString(),
            Label = label,
            Trigger = MaintenanceTrigger.Interval,
            IntervalDays = intervalDays,
            IntervalHours = null,
            EstimatedHours = estimatedHours,
            LastDone = lastDone,
            LastDoneHours = null,
            AssigneeType = assigneeType,
            AssigneeEmployeeId = assigneeEmployeeId
        };
    }

    public static MaintenancePlan CreateHoursBased(
        string label,
        decimal intervalHours,
        decimal estimatedHours,
        AssignmentType assigneeType,
        Guid? assigneeEmployeeId = null,
        decimal? lastDoneHours = null)
    {
        if (string.IsNullOrWhiteSpace(label))
            throw new DomainException("Label is required");
        if (intervalHours <= 0)
            throw new DomainException("IntervalHours must be positive");
        if (estimatedHours <= 0)
            throw new DomainException("EstimatedHours must be positive");
        if (assigneeType == AssignmentType.Internal && assigneeEmployeeId == null)
            throw new DomainException("AssigneeEmployeeId is required for internal assignments");

        return new MaintenancePlan
        {
            Id = Guid.NewGuid().ToString(),
            Label = label,
            Trigger = MaintenanceTrigger.OperatingHours,
            IntervalDays = null,
            IntervalHours = intervalHours,
            EstimatedHours = estimatedHours,
            LastDone = null,
            LastDoneHours = lastDoneHours,
            AssigneeType = assigneeType,
            AssigneeEmployeeId = assigneeEmployeeId
        };
    }

    public MaintenancePlan WithLastDone(DateOnly lastDone)
    {
        if (Trigger != MaintenanceTrigger.Interval)
            throw new DomainException("LastDone can only be set for interval-based plans");

        return this with { LastDone = lastDone };
    }

    public MaintenancePlan WithLastDoneHours(decimal lastDoneHours)
    {
        if (Trigger != MaintenanceTrigger.OperatingHours)
            throw new DomainException("LastDoneHours can only be set for hour-based plans");

        return this with { LastDoneHours = lastDoneHours };
    }
}
