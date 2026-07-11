namespace SpaceOS.Modules.HR.Domain.ValueObjects;

public record AbsenceId(Guid Value)
{
    public static AbsenceId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
