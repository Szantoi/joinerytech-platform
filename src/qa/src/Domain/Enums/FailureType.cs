namespace SpaceOS.Modules.QA.Domain.Enums;

/// <summary>
/// Failure type (for failed inspections)
/// </summary>
public enum FailureType
{
    Scratch = 0,         // Karcolás
    Gap = 1,             // Rés/hézag
    Misalignment = 2,    // Elcsúszás
    Color = 3,           // Színeltérés
    Dimension = 4,       // Méreteltérés
    Surface = 5,         // Felületi hiba
    Functional = 6,      // Működési hiba
    Missing = 7,         // Hiányzó alkatrész
    Damage = 8,          // Sérülés
    Other = 9            // Egyéb
}
