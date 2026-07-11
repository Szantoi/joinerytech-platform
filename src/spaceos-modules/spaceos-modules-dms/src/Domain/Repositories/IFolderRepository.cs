using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository for Folder aggregate persistence and querying (Phase 2).
/// </summary>
public interface IFolderRepository
{
    /// <summary>
    /// Get folder by ID.
    /// </summary>
    Task<Folder?> GetByIdAsync(FolderId id, CancellationToken ct = default);

    /// <summary>
    /// Get children of a folder.
    /// </summary>
    Task<IEnumerable<Folder>> GetByParentIdAsync(
        FolderId parentId,
        CancellationToken ct = default);

    /// <summary>
    /// Get root folders (no parent).
    /// </summary>
    Task<IEnumerable<Folder>> GetRootFoldersAsync(CancellationToken ct = default);

    /// <summary>
    /// Check if folder has children (for delete validation).
    /// </summary>
    Task<bool> HasChildrenAsync(FolderId folderId, CancellationToken ct = default);

    /// <summary>
    /// Check if folder has documents (for delete validation).
    /// </summary>
    Task<bool> HasDocumentsAsync(FolderId folderId, CancellationToken ct = default);

    /// <summary>
    /// Add new folder.
    /// </summary>
    Task AddAsync(Folder folder, CancellationToken ct = default);

    /// <summary>
    /// Update existing folder.
    /// </summary>
    Task UpdateAsync(Folder folder, CancellationToken ct = default);
}

/// <summary>
/// Placeholder for Folder aggregate (Phase 2 implementation).
/// </summary>
public class Folder
{
    // Placeholder - full implementation in Phase 2
}
