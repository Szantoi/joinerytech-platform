using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

public record DailyLoad(decimal Hours, bool IsAbsent, bool IsOverloaded);

public record WeekSummary(
    EmployeeId EmployeeId,
    DateOnly WeekStart,
    decimal TotalHours,
    int DaysAbsent,
    int DaysOverloaded);

// ── Week capacity grid (the /api/hr/capacity?week= response model) ──────────
// Mirror of the portal calc.ts types (DayLoad / EmployeeWeekCapacity): the grid is
// computed SERVER-SIDE and the client only renders it.

/// <summary>The absence that blocks a day's capacity (grid cell marker).</summary>
public record CapacityAbsenceRef(AbsenceId Id, AbsenceType Type);

/// <summary>One employee-day of the grid. A weekend or a blocking absence zeroes the capacity.</summary>
public record CapacityDay(
    DateOnly Day,
    bool Workday,
    decimal Capacity,
    decimal Assigned,
    decimal Free,
    bool Overloaded,
    CapacityAbsenceRef? Absence);

/// <summary>One employee's row of the grid (the configured workdays of the week).</summary>
public record EmployeeWeekCapacity(
    EmployeeId EmployeeId,
    IReadOnlyList<CapacityDay> Days,
    decimal Capacity,
    decimal Assigned,
    /// <summary>Assigned / capacity; 0 when the whole week is blocked (no division by zero).</summary>
    decimal Utilization);

/// <summary>The full weekly grid: the week's Monday, its workdays, and one row per employee.</summary>
public record WeekCapacityGrid(
    DateOnly Week,
    IReadOnlyList<DateOnly> Days,
    IReadOnlyList<EmployeeWeekCapacity> Rows);
