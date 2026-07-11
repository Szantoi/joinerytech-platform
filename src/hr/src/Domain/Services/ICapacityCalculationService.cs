using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

/// <summary>
/// Domain service for calculating employee capacity and workload.
/// Used by Production module for scheduling.
/// </summary>
public interface ICapacityCalculationService
{
    /// <summary>
    /// Calculates daily capacity (hours available per day).
    /// Formula: WeeklyHours / 5 (assumes 5-day work week).
    /// </summary>
    decimal CalculateDailyCapacity(Employee employee);

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
