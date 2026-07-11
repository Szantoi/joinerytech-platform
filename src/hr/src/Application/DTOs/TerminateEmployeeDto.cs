namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Request DTO for terminating an employee.
/// </summary>
public record TerminateEmployeeDto(
    DateTime TerminationDate,
    string Reason
);
