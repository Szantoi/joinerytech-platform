using SpaceOS.Modules.DMS.Domain.Aggregates.Document;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Services;

/// <summary>
/// Domain service for document access control checks.
/// </summary>
public interface IDocumentAccessControlService
{
    bool CanView(Document document, UserId userId);
    bool CanEdit(Document document, UserId userId);
    bool CanDelete(Document document, UserId userId);
    bool CanShare(Document document, UserId userId);
}
