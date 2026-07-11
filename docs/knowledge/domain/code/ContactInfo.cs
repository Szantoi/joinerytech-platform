using System;
using System.Net.Mail;

namespace JoineryTech.CRM.Domain.ValueObjects;

/// <summary>
/// ContactInfo Value Object - Immutable contact information.
/// </summary>
public readonly record struct ContactInfo
{
    public string FullName { get; }
    public EmailAddress Email { get; }
    public PhoneNumber? Phone { get; }

    private ContactInfo(string fullName, EmailAddress email, PhoneNumber? phone)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new DomainException("Contact full name cannot be empty");
        if (fullName.Length > 200)
            throw new DomainException("Contact full name cannot exceed 200 characters");

        FullName = fullName;
        Email = email;
        Phone = phone;
    }

    public static ContactInfo From(string fullName, string email, string? phone = null)
    {
        return new ContactInfo(
            fullName,
            EmailAddress.From(email),
            string.IsNullOrWhiteSpace(phone) ? null : PhoneNumber.From(phone)
        );
    }
}

/// <summary>
/// EmailAddress Value Object - Validated email address.
/// </summary>
public readonly record struct EmailAddress
{
    public string Value { get; }

    private EmailAddress(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("Email cannot be empty");
        if (!IsValidEmail(value))
            throw new DomainException($"Invalid email format: {value}");

        Value = value.ToLowerInvariant();
    }

    public static EmailAddress From(string value) => new(value);

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
}

/// <summary>
/// PhoneNumber Value Object - Normalized phone number.
/// </summary>
public readonly record struct PhoneNumber
{
    public string Value { get; }

    private PhoneNumber(string value)
    {
        // Strip non-numeric characters except + (for country code)
        var cleaned = new string(value.Where(c => char.IsDigit(c) || c == '+').ToArray());

        if (string.IsNullOrWhiteSpace(cleaned))
            throw new DomainException("Phone number cannot be empty");
        if (cleaned.Length < 7 || cleaned.Length > 20)
            throw new DomainException("Phone number must be between 7 and 20 digits");

        Value = cleaned;
    }

    public static PhoneNumber From(string value) => new(value);

    /// <summary>
    /// Formats phone number for display (e.g., "+36 30 123 4567")
    /// </summary>
    public string Formatted()
    {
        // Simple formatting for Hungarian numbers
        if (Value.StartsWith("+36") && Value.Length == 12)
        {
            return $"+36 {Value.Substring(3, 2)} {Value.Substring(5, 3)} {Value.Substring(8)}";
        }

        return Value;
    }
}
