namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Response DTO for employee capacity calculation.
/// </summary>
public record EmployeeCapacityDto(
    Guid EmployeeId,
    string EmployeeName,
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalCapacityHours,
    decimal AvailableHours,
    List<AbsenceListDto> Absences
);
