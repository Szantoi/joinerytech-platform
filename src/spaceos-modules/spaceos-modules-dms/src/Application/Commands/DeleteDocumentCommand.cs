using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Command to soft-delete a document.
/// </summary>
public record DeleteDocumentCommand(DocumentId DocumentId) : IRequest<Result>;
