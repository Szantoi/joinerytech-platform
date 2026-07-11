using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Lightweight DTO for absence list views.
/// </summary>
public record AbsenceListDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateTime StartDate,
    DateTime EndDate,
    AbsenceType Type,
    AbsenceStatus Status,
    DateTime CreatedAt
);
