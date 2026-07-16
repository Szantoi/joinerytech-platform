using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Lists documents (portal list contract): optional status/type/linkType
/// filters, free-text search (q) and the expiring window
/// (ExpiringOnly = portal expiring=true — expired + expiring within the config
/// window, Archived excluded, earliest validity first). Soft-deleted documents
/// never appear. Default order: most recently updated first.
/// </summary>
public record ListDocumentsQuery(
    DocumentStatus? Status = null,
    DocType? Type = null,
    DocLinkType? LinkType = null,
    string? Search = null,
    bool ExpiringOnly = false) : IRequest<IReadOnlyList<DocumentDto>>;

/// <summary>Document detail with the full version chain; null when missing (→ 404).</summary>
public record GetDocumentQuery(Guid DocumentId) : IRequest<DocumentDto?>;
