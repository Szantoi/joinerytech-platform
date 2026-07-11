namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for Document aggregate.
/// </summary>
public record DocumentId(Guid Value)
{
    public static DocumentId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
