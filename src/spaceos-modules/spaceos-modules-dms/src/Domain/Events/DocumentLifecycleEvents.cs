using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.Events;

/// <summary>
/// Document has been uploaded (initial creation).
/// </summary>
public record DocumentUploadedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName,
    string MimeType,
    long SizeBytes,
    UserId UploadedByUserId) : DomainEvent;

/// <summary>
/// A new version has been added to an existing document.
/// </summary>
public record DocumentVersionAddedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    int VersionNumber,
    long SizeBytes,
    UserId UploadedByUserId,
    string ChangeNotes) : DomainEvent;

/// <summary>
/// Document metadata (filename, description, expiry) has been updated.
/// </summary>
public record DocumentMetadataUpdatedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName,
    string Description) : DomainEvent;

/// <summary>
/// Document has been archived (moved out of active state).
/// </summary>
public record DocumentArchivedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName) : DomainEvent;

/// <summary>
/// Document has been unarchived (restored to active state).
/// </summary>
public record DocumentUnarchivedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName) : DomainEvent;

/// <summary>
/// Document has been soft-deleted (moved to trash).
/// </summary>
public record DocumentDeletedEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName,
    int EntityLinkCount) : DomainEvent;

/// <summary>
/// Document has been restored from trash.
/// </summary>
public record DocumentRestoredEvent(
    DocumentId DocumentId,
    TenantId TenantId,
    string FileName) : DomainEvent;
