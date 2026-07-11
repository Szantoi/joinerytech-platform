namespace SpaceOS.Modules.CRM.Domain.ValueObjects;

/// <summary>
/// Encapsulates contact information for Lead/Opportunity.
/// Immutable value object.
/// </summary>
public sealed class ContactInfo : IEquatable<ContactInfo>
{
    public string Name { get; }
    public string Email { get; }
    public string? Phone { get; }
    public string? Company { get; }

    private ContactInfo(string name, string email, string? phone, string? company)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name cannot be empty", nameof(name));
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email cannot be empty", nameof(email));
        if (email.Length > 255 || !email.Contains("@"))
            throw new ArgumentException("Invalid email format", nameof(email));

        Name = name.Trim();
        Email = email.Trim().ToLowerInvariant();
        Phone = phone?.Trim();
        Company = company?.Trim();
    }

    public static ContactInfo Create(
        string name, string email, string? phone = null, string? company = null)
    {
        return new ContactInfo(name, email, phone, company);
    }

    public bool Equals(ContactInfo? other)
    {
        if (ReferenceEquals(null, other)) return false;
        return Email == other.Email &&
               Name == other.Name &&
               Phone == other.Phone &&
               Company == other.Company;
    }

    public override bool Equals(object? obj) => Equals(obj as ContactInfo);

    public override int GetHashCode()
    {
        return HashCode.Combine(Name, Email, Phone, Company);
    }

    public override string ToString() => $"{Name} <{Email}>";
}
