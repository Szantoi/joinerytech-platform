namespace SpaceOS.Modules.DMS.Domain.StrongIds;

/// <summary>
/// Strongly-typed identifier for User (references Kernel/Identity user).
/// </summary>
public record UserId(Guid Value)
{
    public static UserId New() => new(Guid.NewGuid());
    public static UserId From(Guid value) => new(value);
}
