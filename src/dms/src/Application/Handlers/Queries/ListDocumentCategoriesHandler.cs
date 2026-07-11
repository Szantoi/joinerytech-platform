using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;

namespace SpaceOS.Modules.DMS.Application.Handlers.Queries;

/// <summary>
/// Handler for ListDocumentCategoriesQuery.
/// </summary>
public class ListDocumentCategoriesHandler
    : IRequestHandler<ListDocumentCategoriesQuery, DocumentCategoryListDto>
{
    private readonly DMSDbContext _dbContext;

    public ListDocumentCategoriesHandler(DMSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DocumentCategoryListDto> Handle(
        ListDocumentCategoriesQuery request,
        CancellationToken ct)
    {
        var query = _dbContext.DocumentCategories
            .Where(c => c.TenantId == TenantId.From(request.TenantId));

        var totalCount = await query.CountAsync(ct).ConfigureAwait(false);

        var items = await query
            .OrderBy(c => c.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new DocumentCategoryDto
            {
                Id = c.Id.Value,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new DocumentCategoryListDto
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };
    }
}
