using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.DocumentCategory;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for CreateDocumentCategoryCommand.
/// </summary>
public class CreateDocumentCategoryHandler
    : IRequestHandler<CreateDocumentCategoryCommand, Guid>
{
    private readonly IDocumentCategoryRepository _repository;

    public CreateDocumentCategoryHandler(IDocumentCategoryRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(
        CreateDocumentCategoryCommand request,
        CancellationToken ct)
    {
        var category = DocumentCategory.Create(
            new DocumentCategoryId(Guid.NewGuid()),
            TenantId.From(request.TenantId),
            request.Name,
            request.Description);

        await _repository.AddAsync(category, ct).ConfigureAwait(false);
        return category.Id.Value;
    }
}
