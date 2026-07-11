using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Folder;

/// <summary>
/// Folder aggregate root (Phase 2 - Skeleton only).
/// </summary>
public class Folder : AggregateRoot
{
    public FolderId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public FolderId? ParentFolderId { get; private set; }
    public Color Color { get; private set; } = null!;
    public UserId CreatedByUserId { get; private set; } = null!;

    /// <summary>
    /// Factory method to create a new folder (Phase 2 implementation).
    /// </summary>
    public static Folder Create(
        TenantId tenantId,
        string name,
        Color color,
        UserId createdBy,
        FolderId? parentFolderId = null)
    {
        // Validation + implementation (Phase 2)
        throw new NotImplementedException("Phase 2 - Folder aggregate not yet implemented");
    }
}
