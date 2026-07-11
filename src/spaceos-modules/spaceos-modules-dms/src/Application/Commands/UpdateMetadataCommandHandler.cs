using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.Exceptions;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Handler for UpdateMetadataCommand.
/// </summary>
public class UpdateMetadataCommandHandler : IRequestHandler<UpdateMetadataCommand, Result>
{
    private readonly IDocumentRepository _documentRepository;

    public UpdateMetadataCommandHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result> Handle(UpdateMetadataCommand request, CancellationToken ct)
    {
        try
        {
            // Load document aggregate
            var document = await _documentRepository.GetByIdAsync(request.DocumentId, ct).ConfigureAwait(false);

            if (document == null)
            {
                return Result.NotFound($"Document with ID {request.DocumentId.Value} not found");
            }

            // Update metadata
            document.UpdateMetadata(request.Title, request.Description, expiryDate: null);

            // Update tags (clear and re-add)
            var currentTags = document.Tags.ToList();
            foreach (var tag in currentTags)
            {
                document.RemoveTag(tag);
            }

            foreach (var tag in request.Tags ?? Array.Empty<string>())
            {
                if (!string.IsNullOrWhiteSpace(tag))
                {
                    document.AddTag(tag);
                }
            }

            // Persist changes
            await _documentRepository.UpdateAsync(document, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (DomainException ex)
        {
            // Business rule violations (cannot update deleted document)
            return Result.Error(ex.Message);
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to update metadata: {ex.Message}");
        }
    }
}
