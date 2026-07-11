namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Response DTO for employee with full details.
/// </summary>
public record EmployeeDto(
    Guid Id,
    Guid TenantId,
    string FirstName,
    string LastName,
    string Email,
    DateTime HireDate,
    DateTime? TerminationDate,
    string JobTitle,
    Guid DepartmentId,
    string[] Skills,
    decimal TotalCapacityHours,
    int ActiveAbsences,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);
