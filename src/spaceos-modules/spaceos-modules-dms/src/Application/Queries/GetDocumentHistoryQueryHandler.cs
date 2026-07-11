using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Application.DTOs;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Queries;

/// <summary>
/// Handler for GetDocumentHistoryQuery.
/// </summary>
public class GetDocumentHistoryQueryHandler : IRequestHandler<GetDocumentHistoryQuery, Result<IReadOnlyList<DocumentVersionDto>>>
{
    private readonly IDocumentRepository _documentRepository;

    public GetDocumentHistoryQueryHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result<IReadOnlyList<DocumentVersionDto>>> Handle(GetDocumentHistoryQuery request, CancellationToken ct)
    {
        try
        {
            var document = await _documentRepository.GetByIdAsync(request.DocumentId, ct).ConfigureAwait(false);

            if (document == null)
            {
                return Result<IReadOnlyList<DocumentVersionDto>>.NotFound($"Document with ID {request.DocumentId.Value} not found");
            }

            // Map versions to DTOs (newest first)
            var versionDtos = document.Versions
                .OrderByDescending(v => v.VersionNumber)
                .Select(v => new DocumentVersionDto(
                    Id: v.Id,
                    VersionNumber: v.VersionNumber,
                    Comment: v.ChangeNotes,
                    FileSizeBytes: v.SizeBytes,
                    ContentHash: v.Hash,
                    UploadedAt: v.UploadedAt
                ))
                .ToList()
                .AsReadOnly();

            return Result<IReadOnlyList<DocumentVersionDto>>.Success(versionDtos);
        }
        catch (Exception ex)
        {
            return Result<IReadOnlyList<DocumentVersionDto>>.Error($"Failed to retrieve document history: {ex.Message}");
        }
    }
}
