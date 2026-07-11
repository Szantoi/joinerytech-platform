namespace SpaceOS.Modules.HR.Domain.StrongIds;

public record AbsenceId(Guid Value)
{
    public static AbsenceId New() => new(Guid.NewGuid());
    public static AbsenceId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}
