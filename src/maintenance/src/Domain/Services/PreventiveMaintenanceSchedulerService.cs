using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.ValueObjects;

namespace SpaceOS.Modules.Maintenance.Domain.Services;

/// <summary>
/// Preventive maintenance scheduler service.
/// Determines if a maintenance plan is due based on interval (days) or operating hours.
/// </summary>
public class PreventiveMaintenanceSchedulerService : IPreventiveMaintenanceSchedulerService
{
    /// <summary>
    /// Determines if a maintenance plan is due.
    ///
    /// Logic:
    /// - Interval trigger: lastDone + intervalDays <= currentDate
    /// - OperatingHours trigger: lastDoneHours + intervalHours <= currentOperatingHours
    /// </summary>
    public bool IsDue(MaintenancePlan plan, DateOnly currentDate, decimal currentOperatingHours)
    {
        if (plan == null) throw new ArgumentNullException(nameof(plan));

        return plan.Trigger switch
        {
            MaintenanceTrigger.Interval => IsIntervalDue(plan, currentDate),
            MaintenanceTrigger.OperatingHours => IsOperatingHoursDue(plan, currentOperatingHours),
            _ => throw new InvalidOperationException($"Unknown trigger type: {plan.Trigger}")
        };
    }

    private bool IsIntervalDue(MaintenancePlan plan, DateOnly currentDate)
    {
        if (!plan.IntervalDays.HasValue)
            throw new InvalidOperationException("IntervalDays is required for Interval trigger");

        // If never done, it's due
        if (!plan.LastDone.HasValue)
            return true;

        var nextDueDate = plan.LastDone.Value.AddDays(plan.IntervalDays.Value);
        return currentDate >= nextDueDate;
    }

    private bool IsOperatingHoursDue(MaintenancePlan plan, decimal currentOperatingHours)
    {
        if (!plan.IntervalHours.HasValue)
            throw new InvalidOperationException("IntervalHours is required for OperatingHours trigger");

        // If never done, it's due
        if (!plan.LastDoneHours.HasValue)
            return true;

        var nextDueHours = plan.LastDoneHours.Value + plan.IntervalHours.Value;
        return currentOperatingHours >= nextDueHours;
    }
}
