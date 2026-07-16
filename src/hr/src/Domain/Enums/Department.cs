namespace SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// Operational departments of a joinery shop — the portal's designer-APPROVED woodworking
/// taxonomy adopted per ADR-060 (the previous Production/Logistics/Sales/Administration/IT/
/// Maintenance set was a generic industrial scaffold, never fitted to the domain).
///
/// Member names are English (domain stays language-neutral, ADR-059); the Hungarian wire
/// keys are the portal contract (modules/hr/services/employees.ts hrDeptSchema) and belong
/// to the serialization seam (EnumWireMap, ADR-059):
/// Production=gyartas, Installation=szereles, Logistics=logisztika, Design=tervezes,
/// Sales=ertekesites, Office=iroda.
///
/// Remap from the pre-ADR-060 set (documented for completeness — no persisted rows existed):
/// Production→Production, Logistics→Logistics, Sales→Sales, Administration→Office,
/// IT→Office, Maintenance→Production.
/// </summary>
public enum Department
{
    /// <summary>Gyártás / műhely — workshop production.</summary>
    Production = 0,

    /// <summary>Szerelés / beépítés — on-site installation.</summary>
    Installation = 1,

    /// <summary>Logisztika — logistics.</summary>
    Logistics = 2,

    /// <summary>Tervezés — design / CAD.</summary>
    Design = 3,

    /// <summary>Értékesítés — sales.</summary>
    Sales = 4,

    /// <summary>Iroda / admin — office and administration.</summary>
    Office = 5
}
