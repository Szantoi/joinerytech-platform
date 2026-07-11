namespace SpaceOS.Modules.HR.Domain.StrongIds;

public record EmployeeId(Guid Value)
{
    public static EmployeeId New() => new(Guid.NewGuid());
    public static EmployeeId From(Guid value) => new(value);
    public override string ToString() => Value.ToString();
}
