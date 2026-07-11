using SpaceOS.Modules.HR.Domain.Aggregates;

namespace SpaceOS.Modules.HR.Domain.Services;

/// <summary>
/// Domain service for calculating vacation entitlements per Hungarian Labor Code.
/// Mt. §118: Vacation entitlement (20 days base + child extra).
/// Mt. §123: Sick leave (15 days/year paid).
/// </summary>
public interface IVacationEntitlementService
{
    /// <summary>
    /// Calculates vacation entitlement based on employee's children count.
    /// Hungarian Labor Code (Mt. §118):
    /// - 1 child: +2 days
    /// - 2 children: +4 days
    /// - 3+ children: +7 days
    /// </summary>
    VacationEntitlement CalculateEntitlement(Employee employee);

    /// <summary>
    /// Calculates vacation balance for a specific year.
    /// Only counts blocking absences (Approved, InProgress, Completed).
    /// </summary>
    VacationBalance CalculateBalance(Employee employee, int year, IEnumerable<Absence> absences);

    /// <summary>
    /// Calculates sick leave balance for a specific year.
    /// Hungarian Labor Code (Mt. §123): 15 days/year paid.
    /// </summary>
    SickLeaveBalance CalculateSickLeaveBalance(int year, IEnumerable<Absence> absences);
}
