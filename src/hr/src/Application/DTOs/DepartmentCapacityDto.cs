namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Response DTO for department capacity calculation.
/// </summary>
public record DepartmentCapacityDto(
    Guid DepartmentId,
    DateTime StartDate,
    DateTime EndDate,
    decimal TotalCapacityHours,
    decimal AvailableHours,
    List<EmployeeCapacityDto> Employees
);
