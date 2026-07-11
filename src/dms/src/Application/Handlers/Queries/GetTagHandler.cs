using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;

namespace SpaceOS.Modules.DMS.Application.Handlers.Queries;

/// <summary>
/// Handler for GetTagQuery.
/// </summary>
public class GetTagHandler
    : IRequestHandler<GetTagQuery, TagDto?>
{
    private readonly DMSDbContext _dbContext;

    public GetTagHandler(DMSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<TagDto?> Handle(
        GetTagQuery request,
        CancellationToken ct)
    {
        var result = await _dbContext.Tags
            .Where(t => t.Id == new TagId(request.Id))
            .Where(t => t.TenantId == TenantId.From(request.TenantId))
            .Select(t => new TagDto
            {
                Id = t.Id.Value,
                Name = t.Name,
                Color = t.Color,
                IsActive = true,  // Tag doesn't have IsActive property, defaulting to true
                CreatedAt = t.CreatedAt
            })
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);

        return result;
    }
}
