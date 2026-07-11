using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Handler for SearchDocumentsQuery.
/// </summary>
public class SearchDocumentsQueryHandler : IRequestHandler<SearchDocumentsQuery, Result<PagedResult<DocumentListDto>>>
{
    private readonly IDocumentRepository _documentRepository;

    public SearchDocumentsQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<PagedResult<DocumentListDto>>> Handle(SearchDocumentsQuery request, CancellationToken ct)
    {
        try
        {
            // Build search filters
            var filters = new SearchFilters
            {
                Tags = request.Tags,
                // Add other filters as needed
            };

            // Calculate skip for pagination
            var skip = (request.PageNumber - 1) * request.PageSize;

            // Execute search
            var documents = await _documentRepository.SearchAsync(
                request.SearchTerm ?? string.Empty,
                filters,
                skip,
                request.PageSize,
                ct
            ).ConfigureAwait(false);

            // Map to DTOs
            var dtos = documents.Select(d => new DocumentListDto(
                Id: d.Id.Value,
                Title: d.FileName,
                Tags: d.Tags.ToArray(),
                CurrentVersion: d.CurrentVersionNumber,
                CreatedAt: d.UploadedAt
            )).ToList();

            // Note: TotalCount would need a separate count query in production
            var totalCount = dtos.Count; // Simplified for Week 2

            var pagedResult = new PagedResult<DocumentListDto>(
                Items: dtos,
                PageNumber: request.PageNumber,
                PageSize: request.PageSize,
                TotalCount: totalCount
            );

            return Result<PagedResult<DocumentListDto>>.Success(pagedResult);
        }
        catch (Exception ex)
        {
            return Result<PagedResult<DocumentListDto>>.Error($"Search failed: {ex.Message}");
        }
    }
}
