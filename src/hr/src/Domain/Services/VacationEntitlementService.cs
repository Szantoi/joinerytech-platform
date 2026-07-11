using SpaceOS.Modules.HR.Domain.Aggregates;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Domain.Services;

public class VacationEntitlementService : IVacationEntitlementService
{
    private const int BASE_VACATION_DAYS = 20; // Hungarian default
    private const int SICK_LEAVE_DAYS = 15; // Mt. §123

    public VacationEntitlement CalculateEntitlement(Employee employee)
    {
        int childExtra = CalculateChildExtraDays(employee);
        return new VacationEntitlement(
            BASE_VACATION_DAYS,
            childExtra,
            BASE_VACATION_DAYS + childExtra);
    }

    public VacationBalance CalculateBalance(Employee employee, int year, IEnumerable<Absence> absences)
    {
        var entitlement = CalculateEntitlement(employee);

        // Count only blocking vacation absences in the given year
        int used = absences
            .Where(a => a.EmployeeId.Value == employee.Id.Value &&
                        a.Type == AbsenceType.Vacation &&
                        a.StartDate.Year == year &&
                        IsBlockingAbsence(a.Status))
            .Sum(a => a.WorkDays);

        int remaining = entitlement.Total - used;

        return new VacationBalance(
            employee.Id,
            year,
            entitlement.Total,
            entitlement.Base,
            entitlement.ChildExtra,
            used,
            remaining);
    }

    public SickLeaveBalance CalculateSickLeaveBalance(int year, IEnumerable<Absence> absences)
    {
        // Count only blocking sick leave absences in the given year
        int used = absences
            .Where(a => a.Type == AbsenceType.SickLeave &&
                        a.StartDate.Year == year &&
                        IsBlockingAbsence(a.Status))
            .Sum(a => a.WorkDays);

        int remaining = SICK_LEAVE_DAYS - used;

        return new SickLeaveBalance(year, SICK_LEAVE_DAYS, used, remaining);
    }

    private static int CalculateChildExtraDays(Employee employee)
    {
        if (employee.Personal == null)
            return 0;

        // Hungarian Labor Code (Mt. §118) child vacation days
        return employee.Personal.Children switch
        {
            0 => 0,
            1 => 2,
            2 => 4,
            >= 3 => 7,
            _ => 0
        };
    }

    private static bool IsBlockingAbsence(AbsenceStatus status)
    {
        return status == AbsenceStatus.Approved ||
               status == AbsenceStatus.InProgress ||
               status == AbsenceStatus.Completed;
    }
}
