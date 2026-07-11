namespace SpaceOS.Modules.HR.Domain.ValueObjects;

/// <summary>
/// Strongly typed Employee ID
/// </summary>
public record EmployeeId(Guid Value)
{
    public static EmployeeId New() => new(Guid.NewGuid());
    public static EmployeeId From(Guid value) => new(value);
}
