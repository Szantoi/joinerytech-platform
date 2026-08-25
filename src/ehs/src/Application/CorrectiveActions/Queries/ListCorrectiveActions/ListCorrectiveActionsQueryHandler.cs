using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Queries.ListCorrectiveActions;

public class ListCorrectiveActionsQueryHandler : IRequestHandler<ListCorrectiveActionsQuery, List<CapaDto>>
{
    private readonly ICorrectiveActionRepository _repository;

    public ListCorrectiveActionsQueryHandler(ICorrectiveActionRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<CapaDto>> Handle(ListCorrectiveActionsQuery request, CancellationToken ct)
    {
        var actions = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return actions.Select(action => action.ToCapaDto()).ToList();
    }
}
