using AutoMapper;
using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.ListIncidents;

public class ListIncidentsQueryHandler : IRequestHandler<ListIncidentsQuery, List<IncidentListItemDto>>
{
    private readonly IIncidentRepository _repository;
    private readonly IMapper _mapper;

    public ListIncidentsQueryHandler(IIncidentRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<List<IncidentListItemDto>> Handle(ListIncidentsQuery request, CancellationToken ct)
    {
        var incidents = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return _mapper.Map<List<IncidentListItemDto>>(incidents);
    }
}
