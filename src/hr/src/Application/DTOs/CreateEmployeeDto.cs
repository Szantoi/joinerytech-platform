namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Request DTO for creating a new employee.
/// </summary>
public record CreateEmployeeDto(
    string FirstName,
    string LastName,
    string Email,
    DateTime HireDate,
    string JobTitle,
    Guid DepartmentId,
    string[] Skills
);
