using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Enums;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Document commands (DMS-BE-HOST). Every mutation returns the FRESH
/// DocumentDto (portal contract: the UI reconciles optimistic updates from the
/// response body). Grouped in one file: identical tiny shapes, one concern.
/// </summary>

/// <summary>
/// Creates a document with its v1 Draft working copy. Backend extra beyond the
/// portal MSW route set (the mock is seeded); metadata-only until the
/// multipart blob flow lands (IDocumentBlobStore follow-up).
/// </summary>
public record CreateDocumentCommand(
    Guid TenantId,
    string Name,
    DocType Type,
    DocLinkType LinkType,
    string? LinkId,
    string LinkLabel,
    string Owner,
    string? Note,
    string FileLabel,
    DateOnly? ValidUntil) : IRequest<DocumentDto>;

/// <summary>Marker for the shared transition handler base (holds the target id).</summary>
public interface IDocumentTransitionCommand
{
    Guid DocumentId { get; }
}

/// <summary>submit: Draft → UnderReview.</summary>
public record SubmitDocumentCommand(Guid DocumentId)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>approve: UnderReview → Released (optional note → reviewNote).</summary>
public record ApproveDocumentCommand(Guid DocumentId, string? Note)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>reject: UnderReview → Draft (MANDATORY reason — missing → 400).</summary>
public record RejectDocumentCommand(Guid DocumentId, string? Reason)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>recall: Released → UnderReview (optional reason).</summary>
public record RecallDocumentCommand(Guid DocumentId, string? Reason)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>archive: Draft | Released → Archived.</summary>
public record ArchiveDocumentCommand(Guid DocumentId)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>reopen: Archived → Draft.</summary>
public record ReopenDocumentCommand(Guid DocumentId)
    : IRequest<DocumentDto>, IDocumentTransitionCommand;

/// <summary>
/// Uploads a new version: number +1, chain preserved, the new version is a
/// Draft working copy. FileLabel and ChangeNote are mandatory (400 mirror);
/// UploadedBy is optional until auth integration (falls back to the owner).
/// </summary>
public record UploadDocumentVersionCommand(
    Guid DocumentId,
    string? FileLabel,
    string? ChangeNote,
    string? UploadedBy) : IRequest<DocumentDto>;
