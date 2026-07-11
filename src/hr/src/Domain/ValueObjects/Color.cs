using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.ValueObjects;

public record Color
{
    public string Hex { get; init; } = string.Empty;

    private Color() { }

    public static Color Create(string hex)
    {
        if (string.IsNullOrWhiteSpace(hex))
            throw new DomainException("Color hex is required");
        if (!hex.StartsWith("#") || hex.Length != 7)
            throw new DomainException("Color must be in #RRGGBB format");

        return new Color { Hex = hex };
    }

    public static Color Random()
    {
        var random = new Random();
        var r = random.Next(256).ToString("X2");
        var g = random.Next(256).ToString("X2");
        var b = random.Next(256).ToString("X2");
        return new Color { Hex = $"#{r}{g}{b}" };
    }

    public override string ToString() => Hex;
}
