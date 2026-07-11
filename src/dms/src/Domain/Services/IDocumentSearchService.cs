using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Domain service for document search operations.
/// </summary>
public interface IDocumentSearchService
{
    Task<IEnumerable<Document>> SearchAsync(
        TenantId tenantId,
        string searchQuery,
        List<string>? tags = null,
        EntityType? entityType = null,
        CancellationToken cancellationToken = default);

    Task<IEnumerable<Document>> GetRecentAsync(
        TenantId tenantId,
        int limit = 10,
        CancellationToken cancellationToken = default);
}
