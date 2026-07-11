using SpaceOS.Modules.CRM.Domain.Primitives;
using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.ValueObjects;

/// <summary>
/// Phone number value object (simple validation for Hungarian/international format)
/// </summary>
public sealed class PhoneNumber : ValueObject
{
    public string Value { get; private set; } = string.Empty;

    // Private parameterless constructor for EF Core
    private PhoneNumber() { }

    public PhoneNumber(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Phone number cannot be empty", nameof(value));

        // Simple validation: allow digits, spaces, +, -, (, )
        var cleaned = new string(value.Where(c => char.IsDigit(c) || c is '+' or '-' or ' ' or '(' or ')').ToArray());

        if (cleaned.Length < 7 || cleaned.Length > 20)
            throw new ArgumentException("Phone number must be between 7 and 20 characters", nameof(value));

        Value = cleaned;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    public static implicit operator string(PhoneNumber phone) => phone.Value;
}
