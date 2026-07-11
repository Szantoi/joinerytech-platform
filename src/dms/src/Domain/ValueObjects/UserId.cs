namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for User.
/// </summary>
public record UserId(Guid Value)
{
    public static UserId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
