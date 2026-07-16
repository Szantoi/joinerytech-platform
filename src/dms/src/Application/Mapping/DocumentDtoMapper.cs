using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Aggregates.Document;

namespace SpaceOS.Modules.DMS.Application.Mapping;

/// <summary>
/// Document → DocumentDto mapping (Maintenance WorkOrderDtoMapper precedent).
/// The releasedVersion/expiry fields are COMPUTED AT SERVE TIME from the
/// aggregate (portal serveDocument / calc.ts mirror — one source of truth),
/// never persisted.
/// </summary>
public static class DocumentDtoMapper
{
    /// <param name="today">Serve-time "today" (injected for testability).</param>
    /// <param name="expiryWarnDays">Config window (Dms:Expiry:WarnDays).</param>
    public static DocumentDto ToDto(Document document, DateOnly today, int expiryWarnDays)
    {
        return new DocumentDto(
            Id: document.Id.Value,
            Name: document.Name,
            Type: document.Type,
            Status: document.Status,
            Version: document.CurrentVersion,
            LinkType: document.LinkType,
            LinkId: document.LinkId,
            LinkLabel: document.LinkLabel,
            Owner: document.Owner,
            Note: document.Note,
            ReviewNote: document.ReviewNote,
            FileLabel: document.FileLabel,
            ValidUntil: document.ValidUntil,
            UpdatedAt: document.UpdatedAt,
            Versions: document.Versions
                .OrderBy(v => v.VersionNumber)
                .Select(v => new DocumentVersionDto(
                    V: v.VersionNumber,
                    FileLabel: v.FileLabel,
                    Note: v.ChangeNote,
                    Status: v.Status,
                    UploadedBy: v.UploadedBy,
                    UploadedAt: v.UploadedAt))
                .ToList(),
            ReleasedVersion: document.GetReleasedVersion(),
            Expiry: document.GetExpiryState(today, expiryWarnDays));
    }
}
