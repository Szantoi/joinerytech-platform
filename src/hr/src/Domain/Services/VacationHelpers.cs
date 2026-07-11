using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

public record VacationEntitlement(int Base, int ChildExtra, int Total);

public record VacationBalance(
    EmployeeId EmployeeId,
    int Year,
    int Entitlement,
    int Base,
    int ChildExtra,
    int Used,
    int Remaining);

public record SickLeaveBalance(int Year, int Entitlement, int Used, int Remaining);
