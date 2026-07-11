using SpaceOS.Modules.HR.Domain.StrongIds;

namespace SpaceOS.Modules.HR.Domain.Services;

public record DailyLoad(decimal Hours, bool IsAbsent, bool IsOverloaded);

public record WeekSummary(
    EmployeeId EmployeeId,
    DateOnly WeekStart,
    decimal TotalHours,
    int DaysAbsent,
    int DaysOverloaded);
