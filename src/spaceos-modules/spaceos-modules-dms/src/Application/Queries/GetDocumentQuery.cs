using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to get a single document by ID.
/// </summary>
public record GetDocumentQuery(DocumentId DocumentId) : IRequest<Result<DocumentDto>>;
