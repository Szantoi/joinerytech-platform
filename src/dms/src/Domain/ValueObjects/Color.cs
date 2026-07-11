namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Value object representing a color for folder categorization.
/// </summary>
public record Color(string HexCode)
{
    public static Color Blue => new("#007bff");
    public static Color Green => new("#28a745");
    public static Color Red => new("#dc3545");
    public static Color Yellow => new("#ffc107");
    public static Color Purple => new("#6f42c1");
    public static Color Gray => new("#6c757d");
}
