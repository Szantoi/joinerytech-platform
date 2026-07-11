using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository contract for Tag aggregate persistence.
/// </summary>
public interface ITagRepository
{
    Task<Tag?> GetByIdAsync(TagId id, CancellationToken cancellationToken = default);

    Task<IEnumerable<Tag>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Tag?> GetByNameAsync(string name, CancellationToken cancellationToken = default);

    Task AddAsync(Tag tag, CancellationToken cancellationToken = default);

    Task UpdateAsync(Tag tag, CancellationToken cancellationToken = default);

    Task DeleteAsync(TagId id, CancellationToken cancellationToken = default);
}
