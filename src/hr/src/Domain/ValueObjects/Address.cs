using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.ValueObjects;

public record Address
{
    public string Street { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string PostalCode { get; init; } = string.Empty;
    public string Country { get; init; } = string.Empty;

    private Address() { }

    public static Address Create(string street, string city, string postalCode, string country)
    {
        if (string.IsNullOrWhiteSpace(street))
            throw new DomainException("Street is required");
        if (street.Length > 200)
            throw new DomainException("Street must not exceed 200 characters");
        if (string.IsNullOrWhiteSpace(city))
            throw new DomainException("City is required");
        if (city.Length > 100)
            throw new DomainException("City must not exceed 100 characters");
        if (string.IsNullOrWhiteSpace(postalCode))
            throw new DomainException("Postal code is required");
        if (postalCode.Length > 20)
            throw new DomainException("Postal code must not exceed 20 characters");
        if (string.IsNullOrWhiteSpace(country))
            throw new DomainException("Country is required");
        if (country.Length > 50)
            throw new DomainException("Country must not exceed 50 characters");

        return new Address
        {
            Street = street,
            City = city,
            PostalCode = postalCode,
            Country = country
        };
    }

    public override string ToString() => $"{Street}, {City} {PostalCode}, {Country}";
}
