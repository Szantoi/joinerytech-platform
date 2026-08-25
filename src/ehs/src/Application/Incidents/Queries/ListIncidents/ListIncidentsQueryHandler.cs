using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.ListIncidents;

public class ListIncidentsQueryHandler : IRequestHandler<ListIncidentsQuery, List<IncidentListItemDto>>
{
    private readonly IIncidentRepository _repository;

    public ListIncidentsQueryHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<IncidentListItemDto>> Handle(ListIncidentsQuery request, CancellationToken ct)
    {
        var incidents = await _repository.ListAsync(request.Filter, request.TenantId, ct).ConfigureAwait(false);

        return incidents.Select(incident => incident.ToListItemDto()).ToList();
    }
}
