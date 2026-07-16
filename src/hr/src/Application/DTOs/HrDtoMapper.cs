using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Services;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Aggregate → DTO projections for the HR API (QA TicketDtoMapper precedent:
/// one mapping site, so list / detail / transition responses cannot drift apart).
/// </summary>
public static class HrDtoMapper
{
    public static EmployeeDto ToDto(Employee employee) => new(
        Id: employee.Id.Value,
        TenantId: employee.TenantId,
        Name: employee.Name,
        Initials: employee.Initials,
        Role: employee.Role,
        Department: employee.Department,
        FacilityId: employee.FacilityId,
        PayGrade: new PayGradeDto(employee.PayGrade.Name, employee.PayGrade.HourlyRate),
        WeeklyHours: employee.WeeklyHours,
        Email: employee.Email,
        VacationBase: employee.VacationBase,
        Active: employee.Active,
        Skills: employee.Skills
            .Select(s => new EmployeeSkillDto(s.Key, s.Level))
            .ToList());

    /// <param name="employeeName">
    /// Denormalized employee name — the portal's absence rows show it without a second fetch.
    /// </param>
    public static AbsenceDto ToDto(Absence absence, string employeeName) => new(
        Id: absence.Id.Value,
        EmployeeId: absence.EmployeeId.Value,
        EmployeeName: employeeName,
        Type: absence.Type,
        StartDate: absence.StartDate,
        EndDate: absence.EndDate,
        Status: absence.Status,
        WorkDays: absence.WorkDays,
        Reason: absence.Reason,
        ApprovedByUserId: absence.ApprovedByUserId,
        ApprovedAt: absence.ApprovedAt,
        RejectedByUserId: absence.RejectedByUserId,
        RejectedAt: absence.RejectedAt,
        RejectionReason: absence.RejectionReason);

    public static WeekCapacityDto ToDto(WeekCapacityGrid grid) => new(
        Week: grid.Week,
        Days: grid.Days,
        Rows: grid.Rows.Select(ToDto).ToList());

    private static EmployeeWeekCapacityDto ToDto(EmployeeWeekCapacity row) => new(
        EmployeeId: row.EmployeeId.Value,
        Days: row.Days.Select(ToDto).ToList(),
        Capacity: row.Capacity,
        Assigned: row.Assigned,
        Utilization: row.Utilization);

    private static CapacityDayDto ToDto(CapacityDay day) => new(
        Day: day.Day,
        Workday: day.Workday,
        Capacity: day.Capacity,
        Assigned: day.Assigned,
        Free: day.Free,
        Overloaded: day.Overloaded,
        Absence: day.Absence == null
            ? null
            : new CapacityAbsenceRefDto(day.Absence.Id.Value, day.Absence.Type));
}
