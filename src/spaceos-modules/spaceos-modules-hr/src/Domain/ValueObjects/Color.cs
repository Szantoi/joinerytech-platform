namespace SpaceOS.Modules.HR.Domain.ValueObjects;

/// <summary>
/// Color value object for avatar generation
/// </summary>
public record Color(string Hex)
{
    private static readonly string[] Palette = new[]
    {
        "#FF5733", "#33FF57", "#3357FF", "#F333FF", "#FF33F3",
        "#33FFF3", "#F3FF33", "#FF3333", "#33FF33", "#3333FF"
    };

    public static Color Random()
    {
        var hex = Palette[System.Random.Shared.Next(Palette.Length)];
        return new Color(hex);
    }

    public static Color From(string hex)
    {
        if (string.IsNullOrWhiteSpace(hex))
            throw new ArgumentException("Color hex cannot be empty", nameof(hex));

        if (!hex.StartsWith("#") || hex.Length != 7)
            throw new ArgumentException($"Invalid hex color format: {hex}", nameof(hex));

        return new Color(hex.ToUpperInvariant());
    }
}
