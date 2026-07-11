using SpaceOS.Modules.DMS.Domain.Aggregates.Folder;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository contract for Folder aggregate persistence.
/// </summary>
public interface IFolderRepository
{
    Task<Folder?> GetByIdAsync(FolderId id, CancellationToken cancellationToken = default);

    Task<IEnumerable<Folder>> GetByParentAsync(
        TenantId tenantId,
        FolderId? parentFolderId,
        CancellationToken cancellationToken = default);

    Task AddAsync(Folder folder, CancellationToken cancellationToken = default);

    Task UpdateAsync(Folder folder, CancellationToken cancellationToken = default);

    Task DeleteAsync(FolderId id, CancellationToken cancellationToken = default);
}
