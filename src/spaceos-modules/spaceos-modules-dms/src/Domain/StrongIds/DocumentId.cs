namespace SpaceOS.Modules.DMS.Domain.StrongIds;

/// <summary>
/// Strongly-typed identifier for Document aggregate.
/// </summary>
public record DocumentId(Guid Value)
{
    public static DocumentId New() => new(Guid.NewGuid());
    public static DocumentId From(Guid value) => new(value);
}
