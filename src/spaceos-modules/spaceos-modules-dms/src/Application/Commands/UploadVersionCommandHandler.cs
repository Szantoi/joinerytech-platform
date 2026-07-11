using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Repositories;
using SpaceOS.Modules.DMS.Domain.Services;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Handler for UploadVersionCommand.
/// </summary>
public class UploadVersionCommandHandler : IRequestHandler<UploadVersionCommand, Result<Guid>>
{
    private readonly IDocumentRepository _documentRepository;
    private readonly IBlobStorageService _blobStorageService;

    public UploadVersionCommandHandler(
        IDocumentRepository documentRepository,
        IBlobStorageService blobStorageService)
    {
        _documentRepository = documentRepository;
        _blobStorageService = blobStorageService;
    }

    public async Task<Result<Guid>> Handle(UploadVersionCommand request, CancellationToken ct)
    {
        try
        {
            // Load document aggregate
            var document = await _documentRepository.GetByIdAsync(request.DocumentId, ct).ConfigureAwait(false);

            if (document == null)
            {
                return Result<Guid>.NotFound($"Document with ID {request.DocumentId.Value} not found");
            }

            // Add new version
            var version = await document.AddVersionAsync(
                request.FileStream,
                _blobStorageService,
                request.UploadedByUserId,
                request.ChangeNotes ?? string.Empty
            ).ConfigureAwait(false);

            // Persist changes
            await _documentRepository.UpdateAsync(document, ct).ConfigureAwait(false);

            return Result<Guid>.Success(version.Id);
        }
        catch (DomainException ex)
        {
            // Business rule violations (cannot add version to non-active document)
            return Result<Guid>.Error(ex.Message);
        }
        catch (Exception ex)
        {
            return Result<Guid>.Error($"Failed to upload version: {ex.Message}");
        }
    }
}
