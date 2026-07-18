namespace SpaceOS.Modules.HR.Api;

using SpaceOS.Modules.Hosting.Wire;
using SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// The HR module's wire vocabulary (ADR-059).
/// </summary>
/// <remarks>
/// <para>
/// Enums travel as strings, but the HR contract's spellings are a TRANSLATION,
/// not a convention: <c>Department.Production</c> is <c>"gyartas"</c> on the
/// wire, <c>SkillKey.EdgeBanding</c> is <c>"elzaras"</c>. No naming policy
/// derives those, so the map is written out explicitly and is the single place
/// the wire vocabulary is defined — the JSON converters
/// (<see cref="HrApiJsonOptions"/>) and the query-string parsing in the
/// endpoints both read it. Mirror: portal zod schemas
/// (modules/hr/services/employees.ts hrDeptSchema / skillKeySchema /
/// payGradeSchema, services/absences.ts). Mechanics live in the shared
/// SpaceOS.Modules.Hosting package (kontrolling precedent, ADR-059 / ADR-061 §3).
/// </para>
/// <para>
/// Deliberately NOT mapped here:
/// <list type="bullet">
/// <item><description><see cref="SkillLevel"/> — the ONE enum that stays
/// NUMERIC on the wire (1|2|3; portal schema is
/// z.union([z.literal(1), z.literal(2), z.literal(3)])). The property-level
/// SkillLevelWireConverter attribute on the DTOs enforces the numeric form
/// (deliberate ADR-059 exception, ADR-060 §5).</description></item>
/// <item><description><see cref="EmploymentType"/> and
/// <see cref="MaritalStatus"/> — they never cross the wire (internal master
/// data only), so they have no wire vocabulary; if one ever surfaces in a DTO,
/// it needs a map here first (the fallback JsonStringEnumConverter would leak
/// English member names).</description></item>
/// </list>
/// </para>
/// </remarks>
public static class HrWire
{
    /// <summary>Canonical Hungarian department keys (portal hrDeptSchema).</summary>
    public static readonly EnumWireMap<Department> Department = new(
        new Dictionary<Department, string>
        {
            [Domain.Enums.Department.Production] = "gyartas",
            [Domain.Enums.Department.Installation] = "szereles",
            [Domain.Enums.Department.Logistics] = "logisztika",
            [Domain.Enums.Department.Design] = "tervezes",
            [Domain.Enums.Department.Sales] = "ertekesites",
            [Domain.Enums.Department.Office] = "iroda"
        });

    /// <summary>Canonical Hungarian skill keys (portal skillKeySchema).</summary>
    public static readonly EnumWireMap<SkillKey> SkillKey = new(
        new Dictionary<SkillKey, string>
        {
            [Domain.Enums.SkillKey.Cutting] = "szabas",
            [Domain.Enums.SkillKey.EdgeBanding] = "elzaras",
            [Domain.Enums.SkillKey.Cnc] = "cnc",
            [Domain.Enums.SkillKey.Assembly] = "osszeszereles",
            [Domain.Enums.SkillKey.SurfaceFinishing] = "felulet",
            [Domain.Enums.SkillKey.Installation] = "szerel",
            [Domain.Enums.SkillKey.Delivery] = "szallit",
            [Domain.Enums.SkillKey.SiteSurvey] = "felmer",
            [Domain.Enums.SkillKey.Design] = "tervezes",
            [Domain.Enums.SkillKey.Sales] = "ertekesites"
        });

    /// <summary>Canonical Hungarian pay-grade band keys (portal payGradeSchema).</summary>
    public static readonly EnumWireMap<PayGradeBand> PayGradeBand = new(
        new Dictionary<PayGradeBand, string>
        {
            [Domain.Enums.PayGradeBand.Helper] = "seged",
            [Domain.Enums.PayGradeBand.SkilledWorker] = "szakmunkas",
            [Domain.Enums.PayGradeBand.Master] = "mester",
            [Domain.Enums.PayGradeBand.Engineer] = "mernok",
            [Domain.Enums.PayGradeBand.Lead] = "vezeto"
        });

    /// <summary>Absence FSM status labels (portal absence status schema).</summary>
    public static readonly EnumWireMap<AbsenceStatus> AbsenceStatus = new(
        new Dictionary<AbsenceStatus, string>
        {
            [Domain.Enums.AbsenceStatus.Pending] = "kert",
            [Domain.Enums.AbsenceStatus.Approved] = "jovahagyva",
            [Domain.Enums.AbsenceStatus.Rejected] = "elutasitva",
            [Domain.Enums.AbsenceStatus.InProgress] = "folyamatban",
            [Domain.Enums.AbsenceStatus.Completed] = "lezarva"
        });

    /// <summary>Absence type keys (portal absence type schema).</summary>
    public static readonly EnumWireMap<AbsenceType> AbsenceType = new(
        new Dictionary<AbsenceType, string>
        {
            [Domain.Enums.AbsenceType.Vacation] = "szabadsag",
            [Domain.Enums.AbsenceType.SickLeave] = "betegseg",
            [Domain.Enums.AbsenceType.UnpaidLeave] = "fizetes_nelkuli",
            [Domain.Enums.AbsenceType.Other] = "egyeb"
        });
}
