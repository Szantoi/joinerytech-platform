namespace SpaceOS.Modules.HR.Domain.ValueObjects;

/// <summary>
/// Strongly typed Absence ID
/// </summary>
public record AbsenceId(Guid Value)
{
    public static AbsenceId New() => new(Guid.NewGuid());
    public static AbsenceId From(Guid value) => new(value);
}
