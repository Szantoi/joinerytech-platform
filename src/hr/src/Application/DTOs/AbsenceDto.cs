using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Response DTO for absence with full details.
/// </summary>
public record AbsenceDto(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateTime StartDate,
    DateTime EndDate,
    AbsenceType Type,
    AbsenceStatus Status,
    string Reason,
    Guid? ApproverId,
    DateTime? ApprovedAt,
    string? RejectionReason,
    DateTime CreatedAt
);
