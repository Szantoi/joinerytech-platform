using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Events;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.FSM;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Document;

/// <summary>
/// Document aggregate root — versioned document register with the approval
/// workflow (DMS-BE-HOST). The fixed contract is the portal MSW pre-image
/// (src/joinerytech-portal/src/modules/dms — fsm.ts / documents.ts / mocks):
///
///  - Approval FSM: Draft → UnderReview → Released → Archived
///    (+ reject → Draft, recall → UnderReview, reopen → Draft) — the single
///    transition source is <see cref="DocumentStatusTransitions"/>; illegal
///    transitions raise <see cref="InvalidStatusTransitionException"/> (HTTP 409).
///  - Version chain: AddVersion increments the number and PRESERVES earlier
///    entries; the new version starts as a Draft working copy (must be
///    re-approved). Review actions track the CURRENT version's status snapshot,
///    so the released-version calculation can fall back after a recall.
///  - Deleted is an admin-level soft-delete OUTSIDE the FSM (legacy remap:
///    Active → Released; Deleted unchanged).
///
/// EntityLink / Permission / Tag members are the Phase-2 linking model — kept
/// on the aggregate, not yet persisted (EF ignores them; see
/// DocumentEntityTypeConfiguration).
/// </summary>
public class Document : AggregateRoot
{
    public DocumentId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; } = null!;

    /// <summary>Document title (portal: name).</summary>
    public string Name { get; private set; } = null!;

    public DocType Type { get; private set; }
    public DocumentStatus Status { get; private set; }

    /// <summary>Current (highest) version number — the length of the version chain.</summary>
    public int CurrentVersion { get; private set; }

    /// <summary>Denormalized display link (portal linkType/linkId/linkLabel).</summary>
    public DocLinkType LinkType { get; private set; }
    public string? LinkId { get; private set; }
    public string LinkLabel { get; private set; } = null!;

    /// <summary>Display name of the owner — auth integration follow-up (portal contract: string).</summary>
    public string Owner { get; private set; } = null!;

    public string? Note { get; private set; }

    /// <summary>Note of the LAST transition (approval note / rejection reason) — portal reviewNote.</summary>
    public string? ReviewNote { get; private set; }

    /// <summary>File label of the current version (until the real blob flow lands).</summary>
    public string FileLabel { get; private set; } = null!;

    /// <summary>Validity end (null = never expires) — expiry watching input.</summary>
    public DateOnly? ValidUntil { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }

    private readonly List<DocumentVersionEntry> _versions = new();
    private readonly List<EntityLink> _entityLinks = new();
    private readonly List<DocumentPermission> _permissions = new();
    private readonly List<string> _tags = new();

    /// <summary>Full version chain — earlier versions are preserved history.</summary>
    public IReadOnlyList<DocumentVersionEntry> Versions => _versions.AsReadOnly();

    public IReadOnlyList<EntityLink> EntityLinks => _entityLinks.AsReadOnly();
    public IReadOnlyList<DocumentPermission> Permissions => _permissions.AsReadOnly();
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    // EF Core constructor
    private Document() { }

    /// <summary>
    /// Factory: creates a document with its v1 Draft working-copy version
    /// (FSM entry state — portal seed mirror).
    /// </summary>
    public static Document Create(
        TenantId tenantId,
        string name,
        DocType type,
        DocLinkType linkType,
        string? linkId,
        string linkLabel,
        string owner,
        string? note,
        string fileLabel,
        DateOnly? validUntil)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 255)
            throw new DomainException("Name required, max 255 chars");
        if (string.IsNullOrWhiteSpace(owner))
            throw new DomainException("Owner required");
        if (string.IsNullOrWhiteSpace(fileLabel))
            throw new DomainException(DocumentGuardMessages.VersionFileLabelRequired);
        if (linkType != DocLinkType.None && string.IsNullOrWhiteSpace(linkLabel))
            throw new DomainException("LinkLabel required when the document is linked");

        var now = DateTime.UtcNow;
        var document = new Document
        {
            Id = DocumentId.New(),
            TenantId = tenantId,
            Name = name.Trim(),
            Type = type,
            Status = DocumentStatus.Draft,
            CurrentVersion = 1,
            LinkType = linkType,
            LinkId = string.IsNullOrWhiteSpace(linkId) ? null : linkId.Trim(),
            LinkLabel = string.IsNullOrWhiteSpace(linkLabel) ? string.Empty : linkLabel.Trim(),
            Owner = owner.Trim(),
            Note = Normalize(note),
            ReviewNote = null,
            FileLabel = fileLabel.Trim(),
            ValidUntil = validUntil,
            CreatedAt = now,
            UpdatedAt = now
        };

        document._versions.Add(new DocumentVersionEntry(
            versionNumber: 1,
            fileLabel: document.FileLabel,
            changeNote: "Első verzió",
            status: DocumentStatus.Draft,
            uploadedBy: document.Owner,
            uploadedAt: now));

        document.AddDomainEvent(new DocumentCreatedEvent(
            document.Id.Value, tenantId.Value, document.Name));

        return document;
    }

    // ── Approval FSM (portal DOCUMENT_FSM mirror) ───────────────────────────

    /// <summary>submit: Draft → UnderReview (send for review).</summary>
    public void SubmitForReview()
    {
        ApplyTransition(DocumentAction.Submit, reviewNote: null, trackCurrentVersion: true);
        AddDomainEvent(new DocumentSubmittedForReviewEvent(Id.Value, TenantId.Value, CurrentVersion));
    }

    /// <summary>approve: UnderReview → Released (release, optional note → ReviewNote).</summary>
    public void Approve(string? note = null)
    {
        ApplyTransition(DocumentAction.Approve, Normalize(note), trackCurrentVersion: true);
        AddDomainEvent(new DocumentApprovedEvent(Id.Value, TenantId.Value, CurrentVersion, ReviewNote));
    }

    /// <summary>
    /// reject: UnderReview → Draft — the reason is MANDATORY
    /// (portal rejectReasonBlockReason mirror; missing reason → HTTP 400).
    /// </summary>
    public void Reject(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new DomainException(DocumentGuardMessages.RejectReasonRequired);

        ApplyTransition(DocumentAction.Reject, reason.Trim(), trackCurrentVersion: true);
        AddDomainEvent(new DocumentRejectedEvent(Id.Value, TenantId.Value, CurrentVersion, ReviewNote!));
    }

    /// <summary>
    /// recall: Released → UnderReview (re-review; the current version's snapshot
    /// leaves Released, so the shop floor falls back to the previous released version).
    /// </summary>
    public void Recall(string? reason = null)
    {
        ApplyTransition(DocumentAction.Recall, Normalize(reason), trackCurrentVersion: true);
        AddDomainEvent(new DocumentRecalledEvent(Id.Value, TenantId.Value, CurrentVersion, ReviewNote));
    }

    /// <summary>archive: Draft | Released → Archived (the version chain is untouched).</summary>
    public void Archive()
    {
        ApplyTransition(DocumentAction.Archive, reviewNote: null, trackCurrentVersion: false);
        AddDomainEvent(new DocumentArchivedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>reopen: Archived → Draft (working copy again; the chain is untouched).</summary>
    public void Reopen()
    {
        ApplyTransition(DocumentAction.Reopen, reviewNote: null, trackCurrentVersion: false);
        AddDomainEvent(new DocumentReopenedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Shared transition application (MSW applyTransition mirror): FSM guard →
    /// status + ReviewNote + UpdatedAt; review-lifecycle actions also track the
    /// CURRENT version's status snapshot (released-version fallback source).
    /// Illegal transition → <see cref="InvalidStatusTransitionException"/> (HTTP 409).
    /// </summary>
    private void ApplyTransition(DocumentAction action, string? reviewNote, bool trackCurrentVersion)
    {
        if (!DocumentStatusTransitions.CanTransition(action, Status))
            throw new InvalidStatusTransitionException(DocumentGuardMessages.InvalidTransition(Status, action));

        Status = DocumentStatusTransitions.TargetOf(action);
        ReviewNote = reviewNote;
        UpdatedAt = DateTime.UtcNow;

        if (trackCurrentVersion)
            _versions.Single(v => v.VersionNumber == CurrentVersion).TrackStatus(Status);
    }

    // ── Version chain ───────────────────────────────────────────────────────

    /// <summary>
    /// Adds a new version: number +1, earlier entries preserved; the new version
    /// is a Draft working copy and the DOCUMENT falls back to Draft (must be
    /// re-approved — the previously released version stays the valid one).
    /// Guards: Archived/Deleted → 409 mirror; missing fields → 400 mirror.
    /// </summary>
    public DocumentVersionEntry AddVersion(string fileLabel, string changeNote, string? uploadedBy = null)
    {
        if (Status == DocumentStatus.Archived)
            throw new InvalidStatusTransitionException(DocumentGuardMessages.UploadVersionArchived);
        if (Status == DocumentStatus.Deleted)
            throw new InvalidStatusTransitionException(DocumentGuardMessages.UploadVersionDeleted);
        if (string.IsNullOrWhiteSpace(fileLabel))
            throw new DomainException(DocumentGuardMessages.VersionFileLabelRequired);
        if (string.IsNullOrWhiteSpace(changeNote))
            throw new DomainException(DocumentGuardMessages.VersionChangeNoteRequired);

        var now = DateTime.UtcNow;
        CurrentVersion += 1;

        var entry = new DocumentVersionEntry(
            versionNumber: CurrentVersion,
            fileLabel: fileLabel.Trim(),
            changeNote: changeNote.Trim(),
            status: DocumentStatus.Draft,
            uploadedBy: string.IsNullOrWhiteSpace(uploadedBy) ? Owner : uploadedBy.Trim(),
            uploadedAt: now);

        _versions.Add(entry);
        Status = DocumentStatus.Draft;
        FileLabel = entry.FileLabel;
        ReviewNote = null;
        UpdatedAt = now;

        AddDomainEvent(new DocumentVersionAddedEvent(
            Id.Value, TenantId.Value, entry.Id, entry.VersionNumber));

        return entry;
    }

    // ── Computed projections (portal calc.ts mirror — served, never stored) ──

    /// <summary>
    /// The latest RELEASED version number — the shop floor / CNC uses this
    /// (portal releasedVersionInfo.runVersion / prototype DocsEngine.runtimeVersion).
    /// Null when nothing was ever released (production is blocked).
    /// </summary>
    public int? GetReleasedVersion()
    {
        if (Status == DocumentStatus.Released)
            return CurrentVersion;

        return _versions
            .Where(v => v.Status == DocumentStatus.Released)
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => (int?)v.VersionNumber)
            .FirstOrDefault();
    }

    /// <summary>
    /// Expiry state relative to <paramref name="today"/> with the configured
    /// warning window (portal expiryState mirror): past → Expired; within the
    /// window (the ValidUntil day itself is still valid → Expiring); else null.
    /// </summary>
    public ExpiryState? GetExpiryState(DateOnly today, int warnDays)
    {
        if (ValidUntil is not { } validUntil)
            return null;

        var days = validUntil.DayNumber - today.DayNumber;
        if (days < 0)
            return ExpiryState.Expired;
        return days <= warnDays ? ExpiryState.Expiring : null;
    }

    // ── Admin-level soft delete (outside the FSM — legacy Deleted preserved) ─

    /// <summary>Soft-deletes the document (admin level; hidden from listings).</summary>
    public void SoftDelete()
    {
        if (Status == DocumentStatus.Deleted)
            throw new InvalidStatusTransitionException("A dokumentum már törölve van.");

        Status = DocumentStatus.Deleted;
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new DocumentDeletedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Restores a soft-deleted document as a Draft working copy (it must pass
    /// the approval gate again — decision documented in DMS-BE-HOST.md).
    /// </summary>
    public void Restore()
    {
        if (Status != DocumentStatus.Deleted)
            throw new InvalidStatusTransitionException("Csak törölt dokumentum állítható vissza.");

        Status = DocumentStatus.Draft;
        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new DocumentRestoredEvent(Id.Value, TenantId.Value));
    }

    // ── Phase-2 linking model (kept, not yet persisted — see class doc) ──────

    /// <summary>Links this document to an entity (Phase 2 — rich linking model).</summary>
    public void LinkToEntity(EntityType entityType, Guid entityId, UserId linkedBy)
    {
        if (_entityLinks.Any(l => l.EntityType == entityType && l.EntityId == entityId))
            throw new DomainException("Entity already linked");

        var link = new EntityLink(
            new EntityLinkId(Guid.NewGuid()), entityType, entityId, linkedBy, DateTime.UtcNow);
        _entityLinks.Add(link);

        AddDomainEvent(new DocumentLinkedToEntityEvent(Id.Value, TenantId.Value, entityType, entityId));
    }

    /// <summary>Unlinks this document from an entity (Phase 2).</summary>
    public void UnlinkFromEntity(EntityLinkId linkId, UserId unlinkedBy)
    {
        var link = _entityLinks.FirstOrDefault(l => l.Id == linkId)
            ?? throw new DomainException("Link not found");

        _entityLinks.Remove(link);
        AddDomainEvent(new DocumentUnlinkedFromEntityEvent(
            Id.Value, TenantId.Value, link.EntityType, link.EntityId));
    }

    /// <summary>Grants a permission on this document (Phase 2 — permission matrix).</summary>
    public void GrantPermission(PermissionType permissionType, UserId? userId, Guid? roleId, UserId grantedBy)
    {
        if (userId == null && roleId == null)
            throw new DomainException("Either userId or roleId required");
        if (userId != null && roleId != null)
            throw new DomainException("Cannot grant to both user and role");

        _permissions.Add(new DocumentPermission(
            new DocumentPermissionId(Guid.NewGuid()), permissionType, userId, roleId, grantedBy, DateTime.UtcNow));

        AddDomainEvent(new DocumentPermissionGrantedEvent(
            Id.Value, TenantId.Value, permissionType, userId?.Value, roleId));
    }

    /// <summary>Revokes a permission from this document (Phase 2).</summary>
    public void RevokePermission(DocumentPermissionId permissionId, UserId revokedBy)
    {
        var permission = _permissions.FirstOrDefault(p => p.Id == permissionId)
            ?? throw new DomainException("Permission not found");

        _permissions.Remove(permission);
        AddDomainEvent(new DocumentPermissionRevokedEvent(
            Id.Value, TenantId.Value, permission.PermissionType));
    }

    /// <summary>Adds a tag (max 10, no duplicates).</summary>
    public void AddTag(string tag)
    {
        if (_tags.Count >= 10)
            throw new DomainException("Max 10 tags allowed");
        if (!_tags.Contains(tag))
            _tags.Add(tag);
    }

    /// <summary>Removes a tag.</summary>
    public void RemoveTag(string tag) => _tags.Remove(tag);

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
