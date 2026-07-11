namespace SpaceOS.Modules.Maintenance.Domain.StrongIds;

/// <summary>
/// Strongly-typed ID for Asset aggregate
/// </summary>
public record AssetId(Guid Value)
{
    public static AssetId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
