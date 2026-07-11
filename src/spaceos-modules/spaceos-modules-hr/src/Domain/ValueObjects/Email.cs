namespace SpaceOS.Modules.HR.Domain.ValueObjects;

using System.Text.RegularExpressions;

/// <summary>
/// Email value object with validation
/// </summary>
public record Email
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Value { get; }

    private Email(string value)
    {
        Value = value;
    }

    public static Email From(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Email cannot be empty", nameof(value));

        if (!EmailRegex.IsMatch(value))
            throw new ArgumentException($"Invalid email format: {value}", nameof(value));

        return new Email(value.ToLowerInvariant());
    }

    public override string ToString() => Value;
}
