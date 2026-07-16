namespace SpaceOS.Modules.HR.Domain.Enums;

/// <summary>
/// Skill proficiency — the portal's 3-grade scale adopted per ADR-060 (the previous
/// 4-grade Beginner..Expert scale was scaffold; the trade reality is alap/rutin/mester).
///
/// ⚠️ Wire format: this is the ONE enum that travels as a NUMBER (1|2|3), not a string —
/// the portal schema is z.union([z.literal(1), z.literal(2), z.literal(3)]) (deliberate
/// ADR-059 exception, ADR-060 §5). The numeric enum values ARE the wire values, so keep
/// them stable; SkillLevelWireConverter (Application) enforces the numeric form.
///
/// Remap from the pre-ADR-060 scale (documented for completeness — no persisted rows
/// existed): Beginner→Basic, Intermediate→Proficient, Advanced→Proficient (lossy, accepted
/// by ADR-060 §5), Expert→Master.
/// </summary>
public enum SkillLevel
{
    /// <summary>Alap — basic proficiency (wire: 1).</summary>
    Basic = 1,

    /// <summary>Rutin — routine, works unsupervised (wire: 2).</summary>
    Proficient = 2,

    /// <summary>Mester — master level (wire: 3).</summary>
    Master = 3
}
