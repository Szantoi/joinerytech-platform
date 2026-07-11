namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Inspection criteria type
/// </summary>
public enum CriteriaType
{
    Visual = 0,       // Szemrevételezés (scratches, color, finish)
    Dimensional = 1,  // Méretellenőrzés (dimensions, gaps, alignment)
    Functional = 2    // Funkcionális (opens/closes, locks, etc.)
}
