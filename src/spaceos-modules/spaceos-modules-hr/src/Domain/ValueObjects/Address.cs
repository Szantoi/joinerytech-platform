namespace SpaceOS.Modules.HR.Domain.ValueObjects;

/// <summary>
/// Address value object
/// </summary>
public record Address(
    string Street,
    string City,
    string PostalCode,
    string Country)
{
    public static Address Create(string street, string city, string postalCode, string country = "Hungary")
    {
        if (string.IsNullOrWhiteSpace(street))
            throw new ArgumentException("Street is required", nameof(street));

        if (string.IsNullOrWhiteSpace(city))
            throw new ArgumentException("City is required", nameof(city));

        if (string.IsNullOrWhiteSpace(postalCode))
            throw new ArgumentException("Postal code is required", nameof(postalCode));

        return new Address(street, city, postalCode, country);
    }
}
