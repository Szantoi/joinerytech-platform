namespace SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// Joinery skill taxonomy — the portal's designer-APPROVED 10-key woodworking set adopted
/// per ADR-060 (the previous 8-key set — ManualLathe, Welding, ForkliftDriver, … — was a
/// generic metal-industry scaffold, never fitted to the domain).
///
/// Member names are English (domain stays language-neutral, ADR-059); the Hungarian wire
/// keys are the portal contract (modules/hr/services/employees.ts skillKeySchema) and belong
/// to the serialization seam (EnumWireMap, ADR-059):
/// Cutting=szabas, EdgeBanding=elzaras, Cnc=cnc, Assembly=osszeszereles,
/// SurfaceFinishing=felulet, Installation=szerel, Delivery=szallit, SiteSurvey=felmer,
/// Design=tervezes, Sales=ertekesites.
///
/// Remap from the pre-ADR-060 set (documented for completeness — no persisted rows existed):
/// CNCProgramming→Cnc, ManualLathe→Cutting, Welding→Assembly, Painting→SurfaceFinishing,
/// Assembly→Assembly, QualityControl→SiteSurvey, ForkliftDriver→Delivery,
/// ElectricalMaintenance→Installation.
/// </summary>
public enum SkillKey
{
    /// <summary>Szabászat — panel cutting / sawing.</summary>
    Cutting = 0,

    /// <summary>Élzárás — edge banding.</summary>
    EdgeBanding = 1,

    /// <summary>CNC — CNC machining.</summary>
    Cnc = 2,

    /// <summary>Összeszerelés — workshop assembly.</summary>
    Assembly = 3,

    /// <summary>Felületkezelés — surface finishing.</summary>
    SurfaceFinishing = 4,

    /// <summary>Beépítés — on-site installation.</summary>
    Installation = 5,

    /// <summary>Szállítás — delivery / transport.</summary>
    Delivery = 6,

    /// <summary>Felmérés — site survey / measurement.</summary>
    SiteSurvey = 7,

    /// <summary>Tervezés / CAD — design.</summary>
    Design = 8,

    /// <summary>Értékesítés — sales.</summary>
    Sales = 9
}
