using SpaceOS.Kernel.Domain.Exceptions;

namespace SpaceOS.Modules.HR.Domain.ValueObjects;

public record PayGrade
{
    public string Name { get; init; } = string.Empty;
    public decimal HourlyRate { get; init; }

    private PayGrade() { }

    public static PayGrade Create(string name, decimal hourlyRate)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Pay grade name is required");
        if (name.Length > 50)
            throw new DomainException("Pay grade name must not exceed 50 characters");
        if (hourlyRate < 0)
            throw new DomainException("Hourly rate must be non-negative");

        return new PayGrade { Name = name, HourlyRate = hourlyRate };
    }
}
