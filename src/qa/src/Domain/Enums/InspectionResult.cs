namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Inspection result
/// </summary>
public enum InspectionResult
{
    Pending = 0,      // Még nem értékelt
    Pass = 1,         // Megfelelt
    Fail = 2,         // Nem felelt meg
    Conditional = 3   // Feltételesen megfelelt (kisebb hibákkal)
}
