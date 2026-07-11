using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Tag;

/// <summary>
/// Strongly-typed ID for Tag aggregate.
/// </summary>
public record TagId(Guid Value)
{
    public static TagId New() => new(Guid.NewGuid());

    public static implicit operator Guid(TagId id) => id.Value;

    public override string ToString() => Value.ToString();
}
