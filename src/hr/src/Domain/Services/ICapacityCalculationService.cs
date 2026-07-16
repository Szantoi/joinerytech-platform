using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

/// <summary>
/// Domain service for calculating employee capacity and workload.
/// Used by Production module for scheduling and by the HR API's capacity endpoint.
/// </summary>
public interface ICapacityCalculationService
{
    /// <summary>The thresholds this service was configured with (Hr:Capacity section).</summary>
    HrCapacityConfiguration Configuration { get; }

    /// <summary>
    /// Calculates daily capacity (hours available per day).
    /// Formula: WeeklyHours / configured workdays per week (default 5).
    /// </summary>
    decimal CalculateDailyCapacity(Employee employee);

    /// <summary>
    /// Builds the weekly capacity grid (the portal's server-computed /capacity response):
    /// one row per employee, one cell per workday of the week starting at <paramref name="monday"/>.
    /// A blocking absence (Approved/InProgress/Completed) zeroes the day's capacity.
    /// </summary>
    /// <remarks>
    /// Booked hours are always 0 today: the HR domain has no Assignment aggregate yet
    /// (documented gap — see docs/tasks/EPIC-UI-PORTAL-2026Q3/HR-BE-HOST.md). The shape
    /// is already the final one, so wiring assignments in later is additive.
    /// </remarks>
    WeekCapacityGrid CalculateWeekGrid(
        IEnumerable<Employee> employees,
        DateOnly monday,
        IEnumerable<Absence> absences);

    /// <summary>
    /// Calculates daily load for an employee on a specific date.
    /// Takes into account assignments and absences.
    /// </summary>
    DailyLoad CalculateDailyLoad(
        EmployeeId employeeId,
        DateOnly date,
        IEnumerable<object> assignments, // placeholder - will be typed later
        IEnumerable<Absence> absences);

    /// <summary>
    /// Calculates week summary (Mon-Fri only).
    /// </summary>
    WeekSummary CalculateWeekSummary(
        EmployeeId employeeId,
        DateOnly monday,
        IEnumerable<object> assignments,
        IEnumerable<Absence> absences);

    /// <summary>
    /// Detects overloads (load > capacity) for given employees and date range.
    /// Returns set of (EmployeeId, Date) tuples where overload occurs.
    /// </summary>
    HashSet<(EmployeeId, DateOnly)> DetectOverloads(
        IEnumerable<Employee> employees,
        DateOnly startDate,
        DateOnly endDate,
        IEnumerable<object> assignments,
        IEnumerable<Absence> absences);
}
