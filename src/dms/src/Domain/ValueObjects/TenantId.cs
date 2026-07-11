namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Strong typed identifier for Tenant.
/// </summary>
public record TenantId(Guid Value)
{
    public static TenantId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}
