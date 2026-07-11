namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for DocumentVersion.
/// </summary>
public record DocumentVersionId(Guid Value)
{
    public static DocumentVersionId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
