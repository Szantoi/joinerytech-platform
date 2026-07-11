using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Domain service for document versioning operations.
/// </summary>
public interface IDocumentVersioningService
{
    DocumentVersion GetVersion(Document document, int versionNumber);
    DocumentVersion GetLatestVersion(Document document);
    IEnumerable<DocumentVersion> GetAllVersions(Document document);
    bool VerifyIntegrity(DocumentVersion version, Stream fileStream);
}
