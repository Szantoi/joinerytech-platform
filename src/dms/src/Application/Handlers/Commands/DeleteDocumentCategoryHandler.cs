using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for DeleteDocumentCategoryCommand.
/// </summary>
public class DeleteDocumentCategoryHandler
    : IRequestHandler<DeleteDocumentCategoryCommand, bool>
{
    private readonly IDocumentCategoryRepository _repository;

    public DeleteDocumentCategoryHandler(IDocumentCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> Handle(
        DeleteDocumentCategoryCommand request,
        CancellationToken ct)
    {
        var category = await _repository.GetByIdAsync(
            new DocumentCategoryId(request.Id),
            ct).ConfigureAwait(false);

        if (category == null)
            return false;

        await _repository.DeleteAsync(category.Id, ct).ConfigureAwait(false);
        return true;
    }
}
