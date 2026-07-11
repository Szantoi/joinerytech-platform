using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Query to list all Tags with pagination.
/// </summary>
public record ListTagsQuery(
    Guid TenantId,
    int Page = 1,
    int PageSize = 20
) : IRequest<TagListDto>;
