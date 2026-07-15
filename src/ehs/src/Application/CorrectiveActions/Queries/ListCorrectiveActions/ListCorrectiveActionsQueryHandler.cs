using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Queries.ListCorrectiveActions;

public class ListCorrectiveActionsQueryHandler : IRequestHandler<ListCorrectiveActionsQuery, List<CapaDto>>
{
    private readonly ICorrectiveActionRepository _repository;
    private readonly IMapper _mapper;

    public ListCorrectiveActionsQueryHandler(ICorrectiveActionRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<CapaDto>> Handle(ListCorrectiveActionsQuery request, CancellationToken ct)
    {
        var actions = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<CapaDto>>(actions);
    }
}
