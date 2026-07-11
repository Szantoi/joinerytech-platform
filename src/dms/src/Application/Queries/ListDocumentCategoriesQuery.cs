using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to list all DocumentCategories with pagination.
/// </summary>
public record ListDocumentCategoriesQuery(
    Guid TenantId,
    int Page = 1,
    int PageSize = 20
) : IRequest<DocumentCategoryListDto>;
