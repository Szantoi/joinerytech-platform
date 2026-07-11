using SpaceOS.Modules.DMS.Domain.Enums;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Domain.ValueObjects;

/// <summary>
/// Read-only projection of document metadata for listing and search results.
/// </summary>
public record DocumentMetadata(
    DocumentId Id,
    string FileName,
    string MimeType,
    string Description,
    DocumentStatus Status,
    int CurrentVersionNumber,
    long SizeBytes,
    UserId UploadedByUserId,
    DateTime UploadedAt,
    DateOnly? ExpiryDate,
    IReadOnlyList<string> Tags,
    IReadOnlyList<EntityLinkDto> EntityLinks);

/// <summary>
/// DTO for entity links in DocumentMetadata.
/// </summary>
public record EntityLinkDto(EntityType EntityType, Guid EntityId);
