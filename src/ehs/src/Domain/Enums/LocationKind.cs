namespace SpaceOS.Modules.Ehs.Domain.Enums;

/// <summary>
/// Kind of an EHS location node in the hierarchical location registry.
/// Hierarchy convention: Site → Building/Hall → Zone (Outdoor can appear at any level).
/// </summary>
public enum LocationKind
{
    /// <summary>Top-level site (e.g. "Vác — főüzem")</summary>
    Site = 1,

    /// <summary>Building within a site</summary>
    Building = 2,

    /// <summary>Production hall within a site or building</summary>
    Hall = 3,

    /// <summary>Zone within a building or hall (e.g. "A csarnok — festő zóna")</summary>
    Zone = 4,

    /// <summary>Outdoor area (yard, storage area, parking)</summary>
    Outdoor = 5
}
