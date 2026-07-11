using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to create a new document.
/// </summary>
/// <remarks>
/// The FileStream should be provided by the API layer (multipart form upload).
/// Dispose is handled by the API layer after command execution.
/// </remarks>
public class CreateDocumentCommand : IRequest<Result<DocumentId>>
{
    public required TenantId TenantId { get; init; }
    public required FolderId FolderId { get; init; }
    public required string FileName { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    public string[] Tags { get; init; } = Array.Empty<string>();
    public required string ContentType { get; init; }
    public long FileSizeBytes { get; init; }
    public required UserId UploadedByUserId { get; init; }
    public required Stream FileStream { get; init; }
}
