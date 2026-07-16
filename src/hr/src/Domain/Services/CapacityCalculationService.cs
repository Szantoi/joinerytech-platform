using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

public class CapacityCalculationService : ICapacityCalculationService
{
    /// <summary>
    /// Thresholds are config-driven (Hr:Capacity); the parameterless default keeps the
    /// domain usable standalone (Production module, unit tests).
    /// </summary>
    public CapacityCalculationService(HrCapacityConfiguration? configuration = null)
    {
        Configuration = configuration ?? HrCapacityConfiguration.Default;
    }

    public HrCapacityConfiguration Configuration { get; }

    public decimal CalculateDailyCapacity(Employee employee)
    {
        return employee.WeeklyHours / Configuration.WorkdaysPerWeek;
    }

    public WeekCapacityGrid CalculateWeekGrid(
        IEnumerable<Employee> employees,
        DateOnly monday,
        IEnumerable<Absence> absences)
    {
        var absenceList = absences.ToList();
        var days = Enumerable
            .Range(0, Configuration.WorkdaysPerWeek)
            .Select(monday.AddDays)
            .ToList();

        var rows = employees
            .Select(employee => CalculateEmployeeWeek(employee, days, absenceList))
            .ToList();

        return new WeekCapacityGrid(monday, days, rows);
    }

    private EmployeeWeekCapacity CalculateEmployeeWeek(
        Employee employee,
        IReadOnlyList<DateOnly> days,
        IReadOnlyList<Absence> absences)
    {
        var cells = days.Select(day => CalculateDay(employee, day, absences)).ToList();

        var capacity = cells.Sum(c => c.Capacity);
        var assigned = cells.Sum(c => c.Assigned);

        return new EmployeeWeekCapacity(
            employee.Id,
            cells,
            capacity,
            assigned,
            capacity > 0 ? assigned / capacity : 0m);
    }

    private CapacityDay CalculateDay(Employee employee, DateOnly day, IReadOnlyList<Absence> absences)
    {
        var workday = IsWorkday(day);
        var blocking = workday ? FindBlockingAbsence(employee.Id, day, absences) : null;

        // Weekend or blocking absence: the day carries no capacity at all.
        if (!workday || blocking != null)
        {
            return new CapacityDay(
                day, workday, 0m, 0m, 0m, false,
                blocking == null ? null : new CapacityAbsenceRef(blocking.Id, blocking.Type));
        }

        var capacity = CalculateDailyCapacity(employee);
        // No Assignment aggregate in the HR domain yet — booked hours are 0 (documented gap).
        const decimal assigned = 0m;

        return new CapacityDay(
            day,
            Workday: true,
            Capacity: capacity,
            Assigned: assigned,
            Free: Math.Max(0m, capacity - assigned),
            Overloaded: assigned > capacity + Configuration.OverloadEpsilon,
            Absence: null);
    }

    private static bool IsWorkday(DateOnly day)
        => day.DayOfWeek != DayOfWeek.Saturday && day.DayOfWeek != DayOfWeek.Sunday;

    private static Absence? FindBlockingAbsence(
        EmployeeId employeeId,
        DateOnly day,
        IReadOnlyList<Absence> absences)
        => absences.FirstOrDefault(a =>
            a.EmployeeId.Value == employeeId.Value &&
            IsBlockingAbsence(a.Status) &&
            a.StartDate <= day &&
            a.EndDate >= day);

    public DailyLoad CalculateDailyLoad(
        EmployeeId employeeId,
        DateOnly date,
        IEnumerable<object> assignments,
        IEnumerable<Absence> absences)
    {
        // Check if employee is absent on this date (blocking absences only)
        var isAbsent = absences.Any(a =>
            a.EmployeeId.Value == employeeId.Value &&
            a.StartDate <= date &&
            a.EndDate >= date &&
            IsBlockingAbsence(a.Status));

        if (isAbsent)
            return new DailyLoad(0, true, false);

        // For now, assume no assignments (placeholder logic)
        // Real implementation will sum assignment hours
        decimal totalHours = 0;

        // Calculate capacity
        // This would need the Employee to determine capacity, but we don't have it here
        // For now, assume standard capacity - this will be refined in Application layer
        bool isOverloaded = false; // Placeholder

        return new DailyLoad(totalHours, false, isOverloaded);
    }

    public WeekSummary CalculateWeekSummary(
        EmployeeId employeeId,
        DateOnly monday,
        IEnumerable<object> assignments,
        IEnumerable<Absence> absences)
    {
        decimal totalHours = 0;
        int daysAbsent = 0;
        int daysOverloaded = 0;

        // Calculate for the configured workdays only (Mon-Fri by default)
        for (int i = 0; i < Configuration.WorkdaysPerWeek; i++)
        {
            var date = monday.AddDays(i);
            var dailyLoad = CalculateDailyLoad(employeeId, date, assignments, absences);

            totalHours += dailyLoad.Hours;
            if (dailyLoad.IsAbsent) daysAbsent++;
            if (dailyLoad.IsOverloaded) daysOverloaded++;
        }

        return new WeekSummary(
            employeeId,
            monday,
            totalHours,
            daysAbsent,
            daysOverloaded);
    }

    public HashSet<(EmployeeId, DateOnly)> DetectOverloads(
        IEnumerable<Employee> employees,
        DateOnly startDate,
        DateOnly endDate,
        IEnumerable<object> assignments,
        IEnumerable<Absence> absences)
    {
        var overloads = new HashSet<(EmployeeId, DateOnly)>();

        foreach (var employee in employees)
        {
            var dailyCapacity = CalculateDailyCapacity(employee);
            var current = startDate;

            while (current <= endDate)
            {
                var load = CalculateDailyLoad(employee.Id, current, assignments, absences);

                if (load.Hours > dailyCapacity)
                {
                    overloads.Add((employee.Id, current));
                }

                current = current.AddDays(1);
            }
        }

        return overloads;
    }

    private static bool IsBlockingAbsence(AbsenceStatus status)
    {
        return status == AbsenceStatus.Approved ||
               status == AbsenceStatus.InProgress ||
               status == AbsenceStatus.Completed;
    }
}
