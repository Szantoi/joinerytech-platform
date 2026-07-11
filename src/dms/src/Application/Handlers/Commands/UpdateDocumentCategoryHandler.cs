using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for UpdateDocumentCategoryCommand.
/// </summary>
public class UpdateDocumentCategoryHandler
    : IRequestHandler<UpdateDocumentCategoryCommand, bool>
{
    private readonly IDocumentCategoryRepository _repository;

    public UpdateDocumentCategoryHandler(IDocumentCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> Handle(
        UpdateDocumentCategoryCommand request,
        CancellationToken ct)
    {
        var category = await _repository.GetByIdAsync(
            new DocumentCategoryId(request.Id),
            ct).ConfigureAwait(false);

        if (category == null)
            return false;

        category.UpdateName(request.Name);
        category.UpdateDescription(request.Description);

        await _repository.UpdateAsync(category, ct).ConfigureAwait(false);
        return true;
    }
}
