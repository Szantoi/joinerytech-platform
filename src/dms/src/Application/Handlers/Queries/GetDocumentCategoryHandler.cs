using MediatR;
using Microsoft.EntityFrameworkCore;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Application.Queries;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Infrastructure.Persistence;

namespace SpaceOS.Modules.DMS.Application.Handlers.Queries;

/// <summary>
/// Handler for GetDocumentCategoryQuery.
/// </summary>
public class GetDocumentCategoryHandler
    : IRequestHandler<GetDocumentCategoryQuery, DocumentCategoryDto?>
{
    private readonly DMSDbContext _dbContext;

    public GetDocumentCategoryHandler(DMSDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<DocumentCategoryDto?> Handle(
        GetDocumentCategoryQuery request,
        CancellationToken ct)
    {
        var result = await _dbContext.DocumentCategories
            .Where(c => c.Id == new DocumentCategoryId(request.Id))
            .Where(c => c.TenantId == TenantId.From(request.TenantId))
            .Select(c => new DocumentCategoryDto
            {
                Id = c.Id.Value,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt
            })
            .FirstOrDefaultAsync(ct)
            .ConfigureAwait(false);

        return result;
    }
}
