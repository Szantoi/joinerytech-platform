using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Application.DTOs;

/// <summary>
/// Version-chain entry DTO — the portal versionEntrySchema mirror
/// (v / fileLabel / note / status / uploadedBy / uploadedAt).
/// </summary>
public record DocumentVersionDto(
    int V,
    string FileLabel,
    string Note,
    DocumentStatus Status,
    string UploadedBy,
    DateTime UploadedAt);

/// <summary>
/// Document DTO — the portal documentSchema (MSW contract) mirror. Enums travel
/// as camelCase strings (AddDmsApiJsonOptions), so type/linkType/expiry match
/// the portal's canonical keys exactly ("rajz", "project", "lejart", …); the
/// status set is the English FSM naming (draft/underReview/released/archived) —
/// wire-language ADR candidate shared with QA/Maintenance.
/// </summary>
/// <param name="Version">Current (highest) version number — the chain length.</param>
/// <param name="ReviewNote">Note of the LAST transition (approval note / rejection reason).</param>
/// <param name="Versions">Full version chain (earlier versions preserved).</param>
/// <param name="ReleasedVersion">COMPUTED (never stored): the latest released version — calc mirror.</param>
/// <param name="Expiry">COMPUTED (never stored): expiry state within the config window — calc mirror.</param>
public record DocumentDto(
    Guid Id,
    string Name,
    DocType Type,
    DocumentStatus Status,
    int Version,
    DocLinkType LinkType,
    string? LinkId,
    string LinkLabel,
    string Owner,
    string? Note,
    string? ReviewNote,
    string FileLabel,
    DateOnly? ValidUntil,
    DateTime UpdatedAt,
    IReadOnlyList<DocumentVersionDto> Versions,
    int? ReleasedVersion,
    ExpiryState? Expiry);
