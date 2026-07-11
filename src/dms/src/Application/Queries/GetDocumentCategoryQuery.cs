using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to get a DocumentCategory by ID.
/// </summary>
public record GetDocumentCategoryQuery(
    Guid Id,
    Guid TenantId
) : IRequest<DocumentCategoryDto?>;
