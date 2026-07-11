using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Request DTO for requesting an absence.
/// </summary>
public record RequestAbsenceDto(
    Guid EmployeeId,
    DateTime StartDate,
    DateTime EndDate,
    AbsenceType Type,
    string Reason
);
