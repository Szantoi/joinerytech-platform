using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Document;

/// <summary>
/// One entry of the document version chain (portal versionEntrySchema mirror:
/// v / fileLabel / note / status / uploadedBy / uploadedAt).
///
/// The Status is the lifecycle snapshot of THAT version: review actions
/// (submit/approve/reject/recall) update the CURRENT version's entry, and the
/// released-version calculation derives from these snapshots (e.g. after a
/// recall the shop floor falls back to the previous released version).
/// Archive/reopen do NOT touch the chain — a past release is preserved history.
///
/// Child entity of the Document aggregate (owned by EF); mutation only via the
/// aggregate root. BlobPath is reserved for the real file store
/// (IDocumentBlobStore follow-up) — until then fileLabel represents the file.
/// </summary>
public class DocumentVersionEntry
{
    public Guid Id { get; private set; }
    public int VersionNumber { get; private set; }
    public string FileLabel { get; private set; } = null!;

    /// <summary>Change note (audit trail) — mandatory (portal versionFieldsBlockReason mirror).</summary>
    public string ChangeNote { get; private set; } = null!;

    /// <summary>Lifecycle snapshot of this version (see class doc).</summary>
    public DocumentStatus Status { get; private set; }

    /// <summary>Display name of the uploader — auth integration follow-up (portal contract: string).</summary>
    public string UploadedBy { get; private set; } = null!;

    public DateTime UploadedAt { get; private set; }

    /// <summary>Blob store path of the real file content; null until the multipart flow lands.</summary>
    public string? BlobPath { get; private set; }

    // EF Core constructor
    private DocumentVersionEntry() { }

    internal DocumentVersionEntry(
        int versionNumber,
        string fileLabel,
        string changeNote,
        DocumentStatus status,
        string uploadedBy,
        DateTime uploadedAt,
        string? blobPath = null)
    {
        if (versionNumber <= 0)
            throw new DomainException("VersionNumber must be > 0");

        Id = Guid.NewGuid();
        VersionNumber = versionNumber;
        FileLabel = fileLabel;
        ChangeNote = changeNote;
        Status = status;
        UploadedBy = uploadedBy;
        UploadedAt = uploadedAt;
        BlobPath = blobPath;
    }

    /// <summary>Aggregate-internal status-snapshot update (review actions on the current version).</summary>
    internal void TrackStatus(DocumentStatus status) => Status = status;

    /// <summary>Aggregate-internal blob attachment (multipart flow follow-up).</summary>
    internal void AttachBlob(string blobPath) => BlobPath = blobPath;
}
