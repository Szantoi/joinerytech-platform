using SpaceOS.Modules.CRM.Domain.Enums;

namespace SpaceOS.Modules.CRM.Domain.Policies;

/// <summary>
/// Task SLA — a COMPUTED value, never stored (the portal <c>services/sla.ts</c>
/// mirror; the EHS <c>validity.ts</c> pattern: pure, testable functions).
///
///   Ok      → more than <c>soonDays</c> days remain until the due date
///   Soon    → due within <c>soonDays</c> days
///   Overdue → the due date has passed (SLA breach)
///
/// The due date's own day is NOT yet late: the deadline runs to the end of that
/// day (23:59:59.999), matching the portal's <c>daysUntilDue</c>.
/// </summary>
public static class TaskSlaPolicy
{
    /// <summary>
    /// Whole days remaining until the due date (negative = overdue), counted to
    /// the end of the due day.
    /// </summary>
    public static int DaysUntilDue(DateTimeOffset dueDate, DateTimeOffset now)
    {
        var endOfDueDay = new DateTimeOffset(dueDate.Date, dueDate.Offset).AddDays(1).AddTicks(-1);
        return (int)Math.Floor((endOfDueDay - now).TotalDays);
    }

    /// <summary>
    /// SLA state of a task. Completed tasks never breach: they always report
    /// <see cref="TaskSla.Ok"/>.
    /// </summary>
    public static TaskSla Compute(DateTimeOffset dueDate, DateTimeOffset now, int soonDays, bool isCompleted = false)
    {
        if (isCompleted)
        {
            return TaskSla.Ok;
        }

        var days = DaysUntilDue(dueDate, now);

        if (days < 0) return TaskSla.Overdue;
        if (days <= soonDays) return TaskSla.Soon;
        return TaskSla.Ok;
    }
}
