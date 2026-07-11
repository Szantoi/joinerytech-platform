namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Lightweight DTO for employee list views.
/// </summary>
public record EmployeeListDto(
    Guid Id,
    string FullName,
    string Email,
    string JobTitle,
    Guid DepartmentId,
    bool IsActive,
    DateTime HireDate
);
