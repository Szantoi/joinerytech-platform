using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;

namespace SpaceOS.Modules.DMS.Application.Handlers.Queries;

/// <summary>
/// Handler for ListTagsQuery.
/// </summary>
public class ListTagsHandler
    : IRequestHandler<ListTagsQuery, TagListDto>
{
    private readonly DMSDbContext _dbContext;

    public ListTagsHandler(DMSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TagListDto> Handle(
        ListTagsQuery request,
        CancellationToken ct)
    {
        var query = _dbContext.Tags
            .Where(t => t.TenantId == TenantId.From(request.TenantId));

        var totalCount = await query.CountAsync(ct).ConfigureAwait(false);

        var items = await query
            .OrderBy(t => t.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(t => new TagDto
            {
                Id = t.Id.Value,
                Name = t.Name,
                Color = t.Color,
                IsActive = true,  // Tag doesn't have IsActive property, defaulting to true
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(ct)
            .ConfigureAwait(false);

        return new TagListDto
        {
            Items = items,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = totalCount
        };
    }
}
