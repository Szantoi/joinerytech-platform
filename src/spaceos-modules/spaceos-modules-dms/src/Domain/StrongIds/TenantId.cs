using SpaceOS.Modules.DMS.Domain.Exceptions;

namespace SpaceOS.Modules.DMS.Domain.StrongIds;

/// <summary>
/// Strongly-typed identifier for Tenant (multi-tenancy).
/// </summary>
public readonly record struct TenantId
{
    public Guid Value { get; }

    private TenantId(Guid value)
    {
        if (value == Guid.Empty)
            throw new DomainException("TenantId cannot be empty.");

        Value = value;
    }

    public static TenantId From(Guid value) => new(value);
    public static TenantId New() => new(Guid.NewGuid());
    public static implicit operator Guid(TenantId id) => id.Value;
    public override string ToString() => Value.ToString();
}
