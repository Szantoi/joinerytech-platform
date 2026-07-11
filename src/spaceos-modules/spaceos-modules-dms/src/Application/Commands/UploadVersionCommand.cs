using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to upload a new version of an existing document.
/// </summary>
public class UploadVersionCommand : IRequest<Result<Guid>>
{
    public DocumentId DocumentId { get; init; } = null!;
    public UserId UploadedByUserId { get; init; } = null!;
    public string? ChangeNotes { get; init; }
    public Stream FileStream { get; init; } = null!;
}
