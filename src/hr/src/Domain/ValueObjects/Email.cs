using System.Text.RegularExpressions;
using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.ValueObjects;

public record Email
{
    private static readonly Regex EmailRegex = new(
        @"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Value { get; init; } = string.Empty;

    private Email() { }

    public static Email Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Email is required");
        if (!EmailRegex.IsMatch(value))
            throw new DomainException("Invalid email format");
        if (value.Length > 255)
            throw new DomainException("Email must not exceed 255 characters");

        return new Email { Value = value };
    }

    public override string ToString() => Value;
}
