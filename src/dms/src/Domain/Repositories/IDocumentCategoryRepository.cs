using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository contract for DocumentCategory aggregate persistence.
/// </summary>
public interface IDocumentCategoryRepository
{
    Task<DocumentCategory?> GetByIdAsync(DocumentCategoryId id, CancellationToken cancellationToken = default);

    Task<IEnumerable<DocumentCategory>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<DocumentCategory?> GetByNameAsync(string name, CancellationToken cancellationToken = default);

    Task<IEnumerable<DocumentCategory>> GetActiveAsync(CancellationToken cancellationToken = default);

    Task AddAsync(DocumentCategory category, CancellationToken cancellationToken = default);

    Task UpdateAsync(DocumentCategory category, CancellationToken cancellationToken = default);

    Task DeleteAsync(DocumentCategoryId id, CancellationToken cancellationToken = default);
}
