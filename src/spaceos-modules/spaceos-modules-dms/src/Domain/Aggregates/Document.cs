using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Events;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.StrongIds;
using SpaceOS.Modules.DMS.Domain.ValueObjects;
using System.Security.Cryptography;

namespace SpaceOS.Modules.DMS.Domain.Aggregates;

/// <summary>
/// Document aggregate root - represents a document with versioning, entity linking, tagging, and permissions.
/// </summary>
public class Document : AggregateRoot<DocumentId>
{
    public DocumentId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string MimeType { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public DocumentStatus Status { get; private set; }
    public UserId UploadedByUserId { get; private set; } = null!;
    public DateTime UploadedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public DateOnly? ExpiryDate { get; private set; }
    public Guid CurrentVersionId { get; private set; }
    public int CurrentVersionNumber { get; private set; }

    private readonly List<DocumentVersion> _versions = new();
    public IReadOnlyList<DocumentVersion> Versions => _versions.AsReadOnly();

    private readonly List<EntityLink> _entityLinks = new();
    public IReadOnlyList<EntityLink> EntityLinks => _entityLinks.AsReadOnly();

    private readonly List<string> _tags = new();
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    private readonly List<DocumentPermission> _permissions = new();
    public IReadOnlyList<DocumentPermission> Permissions => _permissions.AsReadOnly();

    // Private constructor for EF Core
    private Document() { }

    /// <summary>
    /// Factory method to create a new document with initial version.
    /// </summary>
    public static async Task<Document> CreateAsync(
        TenantId tenantId,
        string fileName,
        string mimeType,
        UserId uploadedByUserId,
        Stream fileStream,
        IBlobStorageService blobStorage,
        string description = "",
        DateOnly? expiryDate = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ArgumentException("File name is required", nameof(fileName));

        if (string.IsNullOrWhiteSpace(mimeType))
            throw new ArgumentException("MIME type is required", nameof(mimeType));

        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException("File content is required", nameof(fileStream));

        var document = new Document
        {
            Id = DocumentId.New(),
            TenantId = tenantId,
            FileName = fileName,
            MimeType = mimeType,
            Description = description ?? string.Empty,
            Status = DocumentStatus.Active,
            UploadedByUserId = uploadedByUserId,
            UploadedAt = DateTime.UtcNow,
            ExpiryDate = expiryDate,
            CreatedAt = DateTime.UtcNow
        };

        // Create first version
        var firstVersion = await document.CreateVersionInternalAsync(
            fileStream, blobStorage, uploadedByUserId, "Initial upload", ct).ConfigureAwait(false);

        document.CurrentVersionId = firstVersion.Id;
        document.CurrentVersionNumber = 1;

        document.AddDomainEvent(new DocumentUploadedEvent(
            document.Id,
            document.TenantId,
            document.FileName,
            document.MimeType,
            firstVersion.SizeBytes,
            document.UploadedByUserId));

        return document;
    }

    /// <summary>
    /// Adds a new version to the document (immutable versioning).
    /// </summary>
    public async Task<DocumentVersion> AddVersionAsync(
        Stream fileStream,
        IBlobStorageService blobStorage,
        UserId uploadedByUserId,
        string changeNotes = "",
        CancellationToken ct = default)
    {
        if (Status != DocumentStatus.Active)
            throw new DomainException("Cannot add version to non-active document");

        if (fileStream == null || fileStream.Length == 0)
            throw new ArgumentException("File content is required", nameof(fileStream));

        var version = await CreateVersionInternalAsync(
            fileStream, blobStorage, uploadedByUserId, changeNotes, ct).ConfigureAwait(false);

        CurrentVersionId = version.Id;
        CurrentVersionNumber = version.VersionNumber;

        AddDomainEvent(new DocumentVersionAddedEvent(
            Id,
            TenantId,
            version.VersionNumber,
            version.SizeBytes,
            uploadedByUserId,
            changeNotes ?? string.Empty));

        return version;
    }

    private async Task<DocumentVersion> CreateVersionInternalAsync(
        Stream fileStream,
        IBlobStorageService blobStorage,
        UserId uploadedByUserId,
        string changeNotes,
        CancellationToken ct)
    {
        var versionNumber = _versions.Count + 1;
        var hash = CalculateSHA256(fileStream);
        fileStream.Position = 0; // Reset stream position after hashing
        var sizeBytes = fileStream.Length;

        // Upload to blob storage
        var blobPath = $"{TenantId.Value}/{Id.Value}/{versionNumber}/{FileName}";
        var fileUrl = await blobStorage.UploadAsync(fileStream, blobPath, MimeType, ct).ConfigureAwait(false);

        var version = new DocumentVersion(
            id: Guid.NewGuid(),
            versionNumber: versionNumber,
            fileUrl: fileUrl,
            hash: hash,
            sizeBytes: sizeBytes,
            uploadedByUserId: uploadedByUserId,
            uploadedAt: DateTime.UtcNow,
            changeNotes: changeNotes ?? string.Empty
        );

        _versions.Add(version);
        return version;
    }

    /// <summary>
    /// Links this document to an entity (Order, Project, Asset, etc.).
    /// </summary>
    public void LinkToEntity(EntityType entityType, Guid entityId, UserId linkedByUserId)
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Cannot link deleted document to entity");

        if (_entityLinks.Any(l => l.EntityType == entityType && l.EntityId == entityId))
            throw new DomainException($"Document already linked to {entityType} {entityId}");

        var link = new EntityLink(entityType, entityId, linkedByUserId, DateTime.UtcNow);

        _entityLinks.Add(link);
        AddDomainEvent(new DocumentLinkedToEntityEvent(
            Id,
            TenantId,
            entityType,
            entityId,
            linkedByUserId));
    }

    /// <summary>
    /// Removes the link between this document and an entity.
    /// </summary>
    public void UnlinkFromEntity(EntityType entityType, Guid entityId)
    {
        var link = _entityLinks.FirstOrDefault(l => l.EntityType == entityType && l.EntityId == entityId);
        if (link == null)
            throw new DomainException($"Document not linked to {entityType} {entityId}");

        _entityLinks.Remove(link);
        AddDomainEvent(new DocumentUnlinkedFromEntityEvent(
            Id,
            TenantId,
            entityType,
            entityId));
    }

    /// <summary>
    /// Adds a tag to this document (idempotent, normalized to lowercase).
    /// </summary>
    public void AddTag(string tag)
    {
        if (string.IsNullOrWhiteSpace(tag))
            throw new ArgumentException("Tag cannot be empty", nameof(tag));

        var normalizedTag = tag.Trim().ToLowerInvariant();
        if (_tags.Contains(normalizedTag))
            return; // Idempotent

        _tags.Add(normalizedTag);
        AddDomainEvent(new DocumentTagAddedEvent(
            Id,
            TenantId,
            normalizedTag));
    }

    /// <summary>
    /// Removes a tag from this document (idempotent).
    /// </summary>
    public void RemoveTag(string tag)
    {
        var normalizedTag = tag.Trim().ToLowerInvariant();
        if (!_tags.Contains(normalizedTag))
            return; // Idempotent

        _tags.Remove(normalizedTag);
        AddDomainEvent(new DocumentTagRemovedEvent(
            Id,
            TenantId,
            normalizedTag));
    }

    /// <summary>
    /// Grants an explicit permission to a user (idempotent).
    /// </summary>
    public void GrantPermission(PermissionType permissionType, UserId grantedToUserId, UserId grantedByUserId)
    {
        if (_permissions.Any(p => p.PermissionType == permissionType && p.GrantedToUserId == grantedToUserId))
            return; // Idempotent

        var permission = new DocumentPermission(permissionType, grantedToUserId, grantedByUserId, DateTime.UtcNow);

        _permissions.Add(permission);
        AddDomainEvent(new DocumentPermissionGrantedEvent(
            Id,
            TenantId,
            permissionType,
            grantedToUserId,
            grantedByUserId));
    }

    /// <summary>
    /// Revokes a permission from a user (idempotent).
    /// </summary>
    public void RevokePermission(PermissionType permissionType, UserId userId)
    {
        var permission = _permissions.FirstOrDefault(p => p.PermissionType == permissionType && p.GrantedToUserId == userId);
        if (permission == null)
            return; // Idempotent

        _permissions.Remove(permission);
        AddDomainEvent(new DocumentPermissionRevokedEvent(
            Id,
            TenantId,
            permissionType,
            userId));
    }

    /// <summary>
    /// Archives this document (soft state change, can be unarchived).
    /// </summary>
    public void Archive()
    {
        if (Status != DocumentStatus.Active)
            throw new DomainException($"Cannot archive document in {Status} status");

        Status = DocumentStatus.Archived;
        ArchivedAt = DateTime.UtcNow;
        AddDomainEvent(new DocumentArchivedEvent(
            Id,
            TenantId,
            FileName));
    }

    /// <summary>
    /// Unarchives this document (restores to Active status).
    /// </summary>
    public void Unarchive()
    {
        if (Status != DocumentStatus.Archived)
            throw new DomainException($"Cannot unarchive document in {Status} status");

        Status = DocumentStatus.Active;
        ArchivedAt = null;
        AddDomainEvent(new DocumentUnarchivedEvent(
            Id,
            TenantId,
            FileName));
    }

    /// <summary>
    /// Soft deletes this document (can be restored later).
    /// </summary>
    public void SoftDelete()
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Document is already deleted");

        Status = DocumentStatus.Deleted;
        DeletedAt = DateTime.UtcNow;
        AddDomainEvent(new DocumentDeletedEvent(
            Id,
            TenantId,
            FileName,
            _entityLinks.Count));
    }

    /// <summary>
    /// Restores a soft-deleted document (back to Active status).
    /// </summary>
    public void Restore()
    {
        if (Status != DocumentStatus.Deleted)
            throw new DomainException($"Cannot restore document in {Status} status");

        Status = DocumentStatus.Active;
        DeletedAt = null;
        AddDomainEvent(new DocumentRestoredEvent(
            Id,
            TenantId,
            FileName));
    }

    /// <summary>
    /// Updates document metadata (filename, description, expiry date).
    /// </summary>
    public void UpdateMetadata(string? fileName = null, string? description = null, DateOnly? expiryDate = null)
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Cannot update deleted document");

        if (!string.IsNullOrWhiteSpace(fileName))
            FileName = fileName;

        if (description != null)
            Description = description;

        if (expiryDate.HasValue)
            ExpiryDate = expiryDate;

        UpdatedAt = DateTime.UtcNow;
        AddDomainEvent(new DocumentMetadataUpdatedEvent(
            Id,
            TenantId,
            FileName,
            Description));
    }

    /// <summary>
    /// Calculates SHA-256 hash of a stream for file integrity verification.
    /// </summary>
    private static string CalculateSHA256(Stream stream)
    {
        using var sha256 = SHA256.Create();
        stream.Position = 0;
        var hashBytes = sha256.ComputeHash(stream);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }
}
