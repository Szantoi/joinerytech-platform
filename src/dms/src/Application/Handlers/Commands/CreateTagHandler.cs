using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Kernel.Domain.ValueObjects;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for CreateTagCommand.
/// </summary>
public class CreateTagHandler
    : IRequestHandler<CreateTagCommand, Guid>
{
    private readonly ITagRepository _repository;

    public CreateTagHandler(ITagRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(
        CreateTagCommand request,
        CancellationToken ct)
    {
        var tag = Tag.Create(
            new TagId(Guid.NewGuid()),
            TenantId.From(request.TenantId),
            request.Name,
            request.Color);

        await _repository.AddAsync(tag, ct).ConfigureAwait(false);
        return tag.Id.Value;
    }
}
