namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for Folder aggregate.
/// </summary>
public record FolderId(Guid Value)
{
    public static FolderId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
