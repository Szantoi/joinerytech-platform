using SpaceOS.Kernel.Domain.Primitives;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;

/// <summary>
/// Strongly-typed ID for DocumentCategory aggregate.
/// </summary>
public record DocumentCategoryId(Guid Value)
{
    public static DocumentCategoryId New() => new(Guid.NewGuid());

    public static implicit operator Guid(DocumentCategoryId id) => id.Value;

    public override string ToString() => Value.ToString();
}
