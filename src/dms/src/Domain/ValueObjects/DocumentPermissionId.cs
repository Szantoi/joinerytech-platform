namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for DocumentPermission.
/// </summary>
public record DocumentPermissionId(Guid Value)
{
    public static DocumentPermissionId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
