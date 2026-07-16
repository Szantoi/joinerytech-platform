using System.Text.Json.Serialization;
using SpaceOS.Modules.HR.Application.Serialization;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Application.DTOs;

/// <summary>
/// Employee response DTO — a faithful projection of the Employee aggregate; used by
/// both the list and the detail endpoint (portal contract: the list returns full
/// employee objects).
///
/// Enums travel as strings on the wire (JsonStringEnumConverter — EHS/QA precedent);
/// SkillLevel is the one exception and travels as a NUMBER (ADR-060 §5).
/// PayGrade is the band key and HourlyRate is the tenant-config rate for that band,
/// resolved at projection time from HrPayGradeConfiguration ("Hr:PayGrades") — the two
/// are separate fields, mirroring the portal employeeSchema (payGrade + hourlyRate).
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
    PayGradeBand PayGrade,
    decimal HourlyRate,
    decimal WeeklyHours,
    string Email,
    int VacationBase,
    bool Active,
    IReadOnlyList<EmployeeSkillDto> Skills
);

/// <summary>Employee skill projection (string skill key + NUMERIC level on the wire).</summary>
public record EmployeeSkillDto(
    SkillKey Key,
    [property: JsonConverter(typeof(SkillLevelWireConverter))] SkillLevel Level);
