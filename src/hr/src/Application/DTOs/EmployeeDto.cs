using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Employee response DTO — a faithful projection of the Employee aggregate; used by
/// both the list and the detail endpoint (portal contract: the list returns full
/// employee objects).
///
/// Enums travel as strings on the wire (JsonStringEnumConverter — EHS/QA precedent).
/// NOTE: the portal's employee shape additionally carries phone / startedAt /
/// employment / color, none of which exist on the aggregate; they are NOT invented
/// here — see the gap list in docs/tasks/EPIC-UI-PORTAL-2026Q3/HR-BE-HOST.md.
/// PersonalData is deliberately absent: it is hr.manage-gated sensitive data.
/// </summary>
public record EmployeeDto(
    Guid Id,
    Guid TenantId,
    string Name,
    string Initials,
    string Role,
    Department Department,
    Guid FacilityId,
    PayGradeDto PayGrade,
    decimal WeeklyHours,
    string Email,
    int VacationBase,
    bool Active,
    IReadOnlyList<EmployeeSkillDto> Skills
);

/// <summary>Pay grade projection (category name + hourly rate).</summary>
public record PayGradeDto(string Name, decimal HourlyRate);

/// <summary>Employee skill projection (skill key + level, both string enums on the wire).</summary>
public record EmployeeSkillDto(SkillKey Key, SkillLevel Level);
