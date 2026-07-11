namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Request DTO for updating employee information.
/// </summary>
public record UpdateEmployeeDto(
    string JobTitle,
    Guid DepartmentId,
    string[] Skills
);
