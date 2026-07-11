using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Handler for GetDocumentQuery.
/// </summary>
public class GetDocumentQueryHandler : IRequestHandler<GetDocumentQuery, Result<DocumentDto>>
{
    private readonly IDocumentRepository _documentRepository;

    public GetDocumentQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<DocumentDto>> Handle(GetDocumentQuery request, CancellationToken ct)
    {
        try
        {
            var document = await _documentRepository.GetByIdAsync(request.DocumentId, ct).ConfigureAwait(false);

            if (document == null)
            {
                return Result<DocumentDto>.NotFound($"Document with ID {request.DocumentId.Value} not found");
            }

            // Map to DTO
            var dto = new DocumentDto(
                Id: document.Id.Value,
                TenantId: document.TenantId.Value,
                FolderId: FolderId.From(Guid.Empty).Value, // TODO: Add FolderId to Document aggregate
                Title: document.FileName, // TODO: Add Title property to Document aggregate
                Description: document.Description,
                Tags: document.Tags.ToArray(),
                CurrentVersion: document.CurrentVersionNumber,
                CreatedAt: document.CreatedAt,
                UpdatedAt: document.UpdatedAt
            );

            return Result<DocumentDto>.Success(dto);
        }
        catch (Exception ex)
        {
            return Result<DocumentDto>.Error($"Failed to retrieve document: {ex.Message}");
        }
    }
}
