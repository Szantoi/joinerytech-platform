using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Domain service for document expiry checks.
/// </summary>
public interface IDocumentExpiryService
{
    IEnumerable<Document> GetExpiring(TenantId tenantId, int daysThreshold = 30);
    IEnumerable<Document> GetExpired(TenantId tenantId);
}
