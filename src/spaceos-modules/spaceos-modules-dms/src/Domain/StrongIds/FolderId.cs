namespace SpaceOS.Modules.DMS.Domain.StrongIds;

/// <summary>
/// Strongly-typed identifier for Folder aggregate (Phase 2).
/// </summary>
public record FolderId(Guid Value)
{
    public static FolderId New() => new(Guid.NewGuid());
    public static FolderId From(Guid value) => new(value);
}
