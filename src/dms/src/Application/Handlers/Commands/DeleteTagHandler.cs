using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for DeleteTagCommand.
/// </summary>
public class DeleteTagHandler
    : IRequestHandler<DeleteTagCommand, bool>
{
    private readonly ITagRepository _repository;

    public DeleteTagHandler(ITagRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> Handle(
        DeleteTagCommand request,
        CancellationToken ct)
    {
        var tag = await _repository.GetByIdAsync(
            new TagId(request.Id),
            ct).ConfigureAwait(false);

        if (tag == null)
            return false;

        await _repository.DeleteAsync(tag.Id, ct).ConfigureAwait(false);
        return true;
    }
}
