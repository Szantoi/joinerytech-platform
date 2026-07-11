using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Commands;

/// <summary>
/// Handler for DeleteDocumentCommand.
/// </summary>
public class DeleteDocumentCommandHandler : IRequestHandler<DeleteDocumentCommand, Result>
{
    private readonly IDocumentRepository _documentRepository;

    public DeleteDocumentCommandHandler(IDocumentRepository documentRepository)
    {
        _documentRepository = documentRepository;
    }

    public async Task<Result> Handle(DeleteDocumentCommand request, CancellationToken ct)
    {
        try
        {
            // Load document aggregate
            var document = await _documentRepository.GetByIdAsync(request.DocumentId, ct).ConfigureAwait(false);

            if (document == null)
            {
                return Result.NotFound($"Document with ID {request.DocumentId.Value} not found");
            }

            // Soft delete
            document.SoftDelete();

            // Persist changes
            await _documentRepository.UpdateAsync(document, ct).ConfigureAwait(false);

            return Result.Success();
        }
        catch (Exception ex)
        {
            return Result.Error($"Failed to delete document: {ex.Message}");
        }
    }
}
