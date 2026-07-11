using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to update document metadata (title, description, tags).
/// </summary>
public record UpdateMetadataCommand(
    DocumentId DocumentId,
    string Title,
    string? Description,
    string[] Tags
) : IRequest<Result>;
