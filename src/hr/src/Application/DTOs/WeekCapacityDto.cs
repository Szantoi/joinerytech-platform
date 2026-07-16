using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// The server-computed weekly capacity grid (GET /api/hr/capacity?week=).
/// The client never computes its own grid — it renders this response
/// (portal services/hr/capacity.ts mirror).
/// </summary>
public record WeekCapacityDto(
    /// <summary>The week's Monday, echoed back from the request.</summary>
    DateOnly Week,
    /// <summary>The workdays of the week (Mon–Fri by default).</summary>
    IReadOnlyList<DateOnly> Days,
    IReadOnlyList<EmployeeWeekCapacityDto> Rows
);

/// <summary>One employee's row of the grid.</summary>
public record EmployeeWeekCapacityDto(
    Guid EmployeeId,
    IReadOnlyList<CapacityDayDto> Days,
    decimal Capacity,
    decimal Assigned,
    decimal Utilization
);

/// <summary>One employee-day cell: a weekend or a blocking absence zeroes the capacity.</summary>
public record CapacityDayDto(
    DateOnly Day,
    bool Workday,
    decimal Capacity,
    decimal Assigned,
    decimal Free,
    bool Overloaded,
    CapacityAbsenceRefDto? Absence
);

/// <summary>The absence blocking a cell (id + type; type is a string on the wire).</summary>
public record CapacityAbsenceRefDto(Guid Id, AbsenceType Type);
