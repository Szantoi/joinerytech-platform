using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.Aggregates;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;
using SpaceOS.Modules.DMS.Domain.StrongIds;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Handler for CreateDocumentCommand.
/// </summary>
public class CreateDocumentCommandHandler : IRequestHandler<CreateDocumentCommand, Result<DocumentId>>
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IBlobStorageService _blobStorageService;

    public CreateDocumentCommandHandler(
        IDocumentRepository documentRepository,
        IBlobStorageService blobStorageService)
    {
        _documentRepository = documentRepository;
        _blobStorageService = blobStorageService;
    }

    public async Task<Result<DocumentId>> Handle(CreateDocumentCommand request, CancellationToken ct)
    {
        try
        {
            // Create document aggregate using factory method
            var document = await Document.CreateAsync(
                request.TenantId,
                request.FileName,
                request.ContentType,
                request.UploadedByUserId,
                request.FileStream,
                _blobStorageService,
                request.Description ?? string.Empty,
                expiryDate: null  // Can be added later via UpdateMetadata
            ).ConfigureAwait(false);

            // Add tags if provided
            foreach (var tag in request.Tags ?? Array.Empty<string>())
            {
                if (!string.IsNullOrWhiteSpace(tag))
                {
                    document.AddTag(tag);
                }
            }

            // Persist the document
            await _documentRepository.AddAsync(document, ct).ConfigureAwait(false);

            return Result<DocumentId>.Success(document.Id);
        }
        catch (ArgumentException ex)
        {
            // Domain validation errors (empty filename, etc.)
            return Result<DocumentId>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            // Infrastructure errors (blob upload failure, database errors)
            return Result<DocumentId>.Error($"Failed to create document: {ex.Message}");
        }
    }
}
