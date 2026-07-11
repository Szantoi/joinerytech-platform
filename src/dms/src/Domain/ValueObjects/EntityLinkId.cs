namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for EntityLink.
/// </summary>
public record EntityLinkId(Guid Value)
{
    public static EntityLinkId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
