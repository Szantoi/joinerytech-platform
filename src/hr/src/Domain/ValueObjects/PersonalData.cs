using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.HR.Domain.Enums;

namespace SpaceOS.Modules.HR.Domain.ValueObjects;

/// <summary>
/// PersonalData contains sensitive employee information.
/// Requires 'hr.manage' permission to read/write.
/// Never log or expose without authorization check.
/// </summary>
public record PersonalData
{
    public int Children { get; init; }
    public MaritalStatus MaritalStatus { get; init; }
    public DateOnly BirthDate { get; init; }
    public string BirthName { get; init; } = string.Empty;
    public string BirthPlace { get; init; } = string.Empty;
    public string MotherName { get; init; } = string.Empty;
    public string Nationality { get; init; } = "HU"; // Hungarian default
    public Address? Address { get; init; }
    public string? PrivatePhone { get; init; }
    public string? PrivateEmail { get; init; }
    public string? EmergencyContactName { get; init; }
    public string? EmergencyContactPhone { get; init; }
    
    // Sensitive identifiers (Hungarian legal requirements)
    public string? TajNumber { get; init; } // Social security (TAJ - Társadalombiztosítási Azonosító Jel)
    public string? TaxId { get; init; } // Tax ID (Adóazonosító jel)
    public string? IdCardNumber { get; init; } // Identity card number
    public string? BankAccount { get; init; } // IBAN

    private PersonalData() { }

    public static PersonalData Create(
        int children,
        MaritalStatus maritalStatus,
        DateOnly birthDate,
        string birthName,
        string birthPlace,
        string motherName,
        string nationality = "HU",
        Address? address = null,
        string? privatePhone = null,
        string? privateEmail = null,
        string? emergencyContactName = null,
        string? emergencyContactPhone = null,
        string? tajNumber = null,
        string? taxId = null,
        string? idCardNumber = null,
        string? bankAccount = null)
    {
        if (children < 0 || children > 10)
            throw new DomainException("Children must be between 0 and 10");
        
        if (birthDate > DateOnly.FromDateTime(DateTime.UtcNow))
            throw new DomainException("Birth date cannot be in the future");
        
        if (string.IsNullOrWhiteSpace(birthName))
            throw new DomainException("Birth name is required");
        if (birthName.Length > 200)
            throw new DomainException("Birth name must not exceed 200 characters");
        
        if (string.IsNullOrWhiteSpace(birthPlace))
            throw new DomainException("Birth place is required");
        if (birthPlace.Length > 200)
            throw new DomainException("Birth place must not exceed 200 characters");
        
        if (string.IsNullOrWhiteSpace(motherName))
            throw new DomainException("Mother name is required (Hungarian legal requirement)");
        if (motherName.Length > 200)
            throw new DomainException("Mother name must not exceed 200 characters");
        
        if (string.IsNullOrWhiteSpace(nationality))
            throw new DomainException("Nationality is required");
        if (nationality.Length > 10)
            throw new DomainException("Nationality must not exceed 10 characters");

        return new PersonalData
        {
            Children = children,
            MaritalStatus = maritalStatus,
            BirthDate = birthDate,
            BirthName = birthName,
            BirthPlace = birthPlace,
            MotherName = motherName,
            Nationality = nationality,
            Address = address,
            PrivatePhone = privatePhone,
            PrivateEmail = privateEmail,
            EmergencyContactName = emergencyContactName,
            EmergencyContactPhone = emergencyContactPhone,
            TajNumber = tajNumber,
            TaxId = taxId,
            IdCardNumber = idCardNumber,
            BankAccount = bankAccount
        };
    }
}
