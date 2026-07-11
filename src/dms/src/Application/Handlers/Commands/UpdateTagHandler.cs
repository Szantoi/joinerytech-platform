using MediatR;
using SpaceOS.Modules.DMS.Application.Commands;
using SpaceOS.Modules.DMS.Domain.Aggregates.Tag;
using SpaceOS.Modules.DMS.Domain.Repositories;

namespace SpaceOS.Modules.DMS.Application.Handlers.Commands;

/// <summary>
/// Handler for UpdateTagCommand.
/// </summary>
public class UpdateTagHandler
    : IRequestHandler<UpdateTagCommand, bool>
{
    private readonly ITagRepository _repository;

    public UpdateTagHandler(ITagRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> Handle(
        UpdateTagCommand request,
        CancellationToken ct)
    {
        var tag = await _repository.GetByIdAsync(
            new TagId(request.Id),
            ct).ConfigureAwait(false);

        if (tag == null)
            return false;

        tag.UpdateName(request.Name);
        tag.UpdateColor(request.Color);

        await _repository.UpdateAsync(tag, ct).ConfigureAwait(false);
        return true;
    }
}
