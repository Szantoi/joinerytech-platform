using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Application.Mappings;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentById;

public class GetIncidentByIdQueryHandler : IRequestHandler<GetIncidentByIdQuery, IncidentDto?>
{
    private readonly IIncidentRepository _repository;

    public GetIncidentByIdQueryHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<IncidentDto?> Handle(GetIncidentByIdQuery request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        return incident?.ToDto();
    }
}
