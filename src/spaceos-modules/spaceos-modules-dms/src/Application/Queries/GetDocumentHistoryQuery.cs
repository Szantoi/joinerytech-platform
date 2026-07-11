using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to get all versions of a document (history).
/// </summary>
public record GetDocumentHistoryQuery(DocumentId DocumentId) : IRequest<Result<IReadOnlyList<DocumentVersionDto>>>;
