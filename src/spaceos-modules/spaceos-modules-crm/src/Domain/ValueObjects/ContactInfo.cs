using SpaceOS.Modules.CRM.Domain.Primitives;
using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.CRM.Domain.ValueObjects;

/// <summary>
/// Contact information value object
/// </summary>
public sealed class ContactInfo : ValueObject
{
    public string Name { get; private set; } = string.Empty;
    public Email Email { get; private set; } = null!;
    public PhoneNumber? Phone { get; private set; }
    public string? Company { get; private set; }

    // Private parameterless constructor for EF Core
    private ContactInfo() { }

    public ContactInfo(string name, Email email, PhoneNumber? phone, string? company)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Name is required", nameof(name));

        Name = name;
        Email = email ?? throw new ArgumentNullException(nameof(email));
        Phone = phone;
        Company = company;
    }

    protected override IEnumerable<object> GetEqualityComponents()
    {
        yield return Name;
        yield return Email;
        yield return Phone?.Value ?? string.Empty;
        yield return Company ?? string.Empty;
    }
}
