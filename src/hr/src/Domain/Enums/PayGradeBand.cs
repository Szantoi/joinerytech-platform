namespace SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// Pay grade band — the portal's 5 fixed bands adopted per ADR-060. The band is a
/// taxonomy KEY only: the hourly rate that belongs to a band is tenant-specific business
/// data and lives in configuration (Hr:PayGrades — see HrPayGradeConfiguration), NOT in
/// this enum and NOT on the Employee aggregate (ADR-060: PayGrade is built the (c) way
/// already — band key in the domain, rate in tenant config).
///
/// Member names are English (domain stays language-neutral, ADR-059); the Hungarian wire
/// keys are the portal contract (modules/hr/services/employees.ts payGradeSchema) and
/// belong to the serialization seam (EnumWireMap, ADR-059):
/// Helper=seged, SkilledWorker=szakmunkas, Master=mester, Engineer=mernok, Lead=vezeto.
/// </summary>
public enum PayGradeBand
{
    /// <summary>Segéd / betanított — helper / semi-skilled.</summary>
    Helper = 0,

    /// <summary>Szakmunkás — skilled worker.</summary>
    SkilledWorker = 1,

    /// <summary>Mester / előmunkás — master / foreman.</summary>
    Master = 2,

    /// <summary>Mérnök / tervező — engineer / designer.</summary>
    Engineer = 3,

    /// <summary>Vezető — lead / manager.</summary>
    Lead = 4
}
