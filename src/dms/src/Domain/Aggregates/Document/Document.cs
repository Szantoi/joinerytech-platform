using SpaceOS.Kernel.Domain.Exceptions;
using SpaceOS.Kernel.Domain.Primitives;
using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.Events;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.ValueObjects;

namespace SpaceOS.Modules.DMS.Domain.Aggregates.Document;

/// <summary>
/// Document aggregate root with versioning, entity linking, and permissions.
/// </summary>
public class Document : AggregateRoot
{
    public DocumentId Id { get; private set; } = null!;
    public TenantId TenantId { get; private set; } = null!;
    public string FileName { get; private set; } = null!;
    public string MimeType { get; private set; } = null!;
    public long SizeBytes { get; private set; }
    public DocumentStatus Status { get; private set; }
    public DocumentVersionId CurrentVersionId { get; private set; } = null!;
    public UserId UploadedByUserId { get; private set; } = null!;
    public DateTime UploadedAt { get; private set; }

    private readonly List<DocumentVersion> _versions = new();
    private readonly List<EntityLink> _entityLinks = new();
    private readonly List<DocumentPermission> _permissions = new();
    private readonly List<string> _tags = new();

    public IReadOnlyList<DocumentVersion> Versions => _versions.AsReadOnly();
    public IReadOnlyList<EntityLink> EntityLinks => _entityLinks.AsReadOnly();
    public IReadOnlyList<DocumentPermission> Permissions => _permissions.AsReadOnly();
    public IReadOnlyList<string> Tags => _tags.AsReadOnly();

    public DocumentMetadata? Metadata { get; private set; }

    /// <summary>
    /// Factory method to upload a new document.
    /// </summary>
    public static Document Upload(
        TenantId tenantId,
        string fileName,
        string mimeType,
        long sizeBytes,
        Stream fileStream,
        IBlobStorageService blobStorage,
        UserId uploadedBy,
        List<string>? tags = null,
        string? description = null,
        DateOnly? expiryDate = null)
    {
        // Validation
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Length > 255)
            throw new DomainException("FileName required, max 255 chars");

        if (sizeBytes <= 0 || sizeBytes > 50 * 1024 * 1024)
            throw new DomainException("File size must be >0 and <50MB");

        if (tags?.Count > 10)
            throw new DomainException("Max 10 tags allowed");

        var document = new Document
        {
            Id = new DocumentId(Guid.NewGuid()),
            TenantId = tenantId,
            FileName = fileName,
            MimeType = mimeType,
            SizeBytes = sizeBytes,
            Status = DocumentStatus.Active,
            UploadedByUserId = uploadedBy,
            UploadedAt = DateTime.UtcNow
        };

        // Add first version
        var firstVersion = document.AddVersion(fileStream, blobStorage, uploadedBy, "Initial upload");
        document.CurrentVersionId = firstVersion.Id;

        // Metadata
        if (description != null || expiryDate != null)
            document.Metadata = new DocumentMetadata(description, expiryDate);

        // Tags
        if (tags != null)
            document._tags.AddRange(tags);

        document.AddDomainEvent(new DocumentUploadedEvent(
            document.Id.Value,
            tenantId.Value,
            fileName,
            mimeType,
            sizeBytes,
            uploadedBy.Value));

        return document;
    }

    /// <summary>
    /// Adds a new version to the document.
    /// </summary>
    public DocumentVersion AddVersion(
        Stream fileStream,
        IBlobStorageService blobStorage,
        UserId uploadedBy,
        string? changeNotes = null)
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Cannot add version to deleted document");

        var versionNumber = _versions.Count + 1;
        var hash = CalculateSHA256(fileStream);
        fileStream.Position = 0; // Reset for upload

        var fileUrl = blobStorage.Upload(
            TenantId.Value,
            Id.Value,
            versionNumber,
            FileName,
            fileStream);

        var version = new DocumentVersion(
            new DocumentVersionId(Guid.NewGuid()),
            versionNumber,
            fileUrl,
            hash,
            SizeBytes,
            uploadedBy,
            DateTime.UtcNow,
            changeNotes);

        _versions.Add(version);
        CurrentVersionId = version.Id;

        AddDomainEvent(new DocumentVersionAddedEvent(
            Id.Value,
            TenantId.Value,
            version.Id.Value,
            versionNumber));

        return version;
    }

    /// <summary>
    /// Links this document to an entity.
    /// </summary>
    public void LinkToEntity(EntityType entityType, Guid entityId, UserId linkedBy)
    {
        if (_entityLinks.Any(l => l.EntityType == entityType && l.EntityId == entityId))
            throw new DomainException("Entity already linked");

        var link = new EntityLink(
            new EntityLinkId(Guid.NewGuid()),
            entityType,
            entityId,
            linkedBy,
            DateTime.UtcNow);

        _entityLinks.Add(link);

        AddDomainEvent(new DocumentLinkedToEntityEvent(
            Id.Value,
            TenantId.Value,
            entityType,
            entityId));
    }

    /// <summary>
    /// Unlinks this document from an entity.
    /// </summary>
    public void UnlinkFromEntity(EntityLinkId linkId, UserId unlinkedBy)
    {
        var link = _entityLinks.FirstOrDefault(l => l.Id == linkId);
        if (link == null)
            throw new DomainException("Link not found");

        _entityLinks.Remove(link);

        AddDomainEvent(new DocumentUnlinkedFromEntityEvent(
            Id.Value,
            TenantId.Value,
            link.EntityType,
            link.EntityId));
    }

    /// <summary>
    /// Grants a permission on this document.
    /// </summary>
    public void GrantPermission(
        PermissionType permissionType,
        UserId? userId,
        Guid? roleId,
        UserId grantedBy)
    {
        if (userId == null && roleId == null)
            throw new DomainException("Either userId or roleId required");

        if (userId != null && roleId != null)
            throw new DomainException("Cannot grant to both user and role");

        var permission = new DocumentPermission(
            new DocumentPermissionId(Guid.NewGuid()),
            permissionType,
            userId,
            roleId,
            grantedBy,
            DateTime.UtcNow);

        _permissions.Add(permission);

        AddDomainEvent(new DocumentPermissionGrantedEvent(
            Id.Value,
            TenantId.Value,
            permissionType,
            userId?.Value,
            roleId));
    }

    /// <summary>
    /// Revokes a permission from this document.
    /// </summary>
    public void RevokePermission(DocumentPermissionId permissionId, UserId revokedBy)
    {
        var permission = _permissions.FirstOrDefault(p => p.Id == permissionId);
        if (permission == null)
            throw new DomainException("Permission not found");

        _permissions.Remove(permission);

        AddDomainEvent(new DocumentPermissionRevokedEvent(
            Id.Value,
            TenantId.Value,
            permission.PermissionType));
    }

    /// <summary>
    /// Archives this document.
    /// </summary>
    public void Archive()
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Cannot archive deleted document");

        Status = DocumentStatus.Archived;
        AddDomainEvent(new DocumentArchivedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Unarchives this document.
    /// </summary>
    public void Unarchive()
    {
        if (Status != DocumentStatus.Archived)
            throw new DomainException("Document not archived");

        Status = DocumentStatus.Active;
        AddDomainEvent(new DocumentUnarchivedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Soft-deletes this document.
    /// </summary>
    public void SoftDelete()
    {
        if (Status == DocumentStatus.Deleted)
            throw new DomainException("Already deleted");

        Status = DocumentStatus.Deleted;
        AddDomainEvent(new DocumentDeletedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Restores this document from deleted status.
    /// </summary>
    public void Restore()
    {
        if (Status != DocumentStatus.Deleted)
            throw new DomainException("Document not deleted");

        Status = DocumentStatus.Active;
        AddDomainEvent(new DocumentRestoredEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Updates document metadata.
    /// </summary>
    public void UpdateMetadata(string? description, DateOnly? expiryDate)
    {
        Metadata = new DocumentMetadata(description, expiryDate);
        AddDomainEvent(new DocumentMetadataUpdatedEvent(Id.Value, TenantId.Value));
    }

    /// <summary>
    /// Adds a tag to the document.
    /// </summary>
    public void AddTag(string tag)
    {
        if (_tags.Count >= 10)
            throw new DomainException("Max 10 tags allowed");

        if (!_tags.Contains(tag))
            _tags.Add(tag);
    }

    /// <summary>
    /// Removes a tag from the document.
    /// </summary>
    public void RemoveTag(string tag)
    {
        _tags.Remove(tag);
    }

    /// <summary>
    /// Calculates SHA-256 hash of a stream.
    /// </summary>
    private static string CalculateSHA256(Stream stream)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var hash = sha256.ComputeHash(stream);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}
