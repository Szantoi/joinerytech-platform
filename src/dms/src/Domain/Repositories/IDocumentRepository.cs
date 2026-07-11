using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Repositories;

/// <summary>
/// Repository contract for Document aggregate persistence.
/// </summary>
public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(DocumentId id, CancellationToken cancellationToken = default);

    Task<IEnumerable<Document>> GetByEntityAsync(
        TenantId tenantId,
        EntityType entityType,
        Guid entityId,
        CancellationToken cancellationToken = default);

    Task AddAsync(Document document, CancellationToken cancellationToken = default);

    Task UpdateAsync(Document document, CancellationToken cancellationToken = default);

    Task DeleteAsync(DocumentId id, CancellationToken cancellationToken = default);
}
