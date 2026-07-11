using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;
using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

public class CapacityCalculationService : ICapacityCalculationService
{
    public decimal CalculateDailyCapacity(Employee employee)
    {
        // Assume 5-day work week
        return employee.WeeklyHours / 5;
    }

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

        // Calculate for Mon-Fri only
        for (int i = 0; i < 5; i++)
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
