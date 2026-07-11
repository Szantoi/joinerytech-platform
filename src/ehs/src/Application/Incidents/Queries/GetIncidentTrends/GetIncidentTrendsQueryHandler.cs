using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentTrends;

public class GetIncidentTrendsQueryHandler : IRequestHandler<GetIncidentTrendsQuery, IncidentTrendsDto>
{
    private readonly IIncidentRepository _repository;

    public GetIncidentTrendsQueryHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<IncidentTrendsDto> Handle(GetIncidentTrendsQuery request, CancellationToken ct)
    {
        var trends = await _repository.GetTrendsAsync(request.TenantId, request.MonthsBack, ct).ConfigureAwait(false);

        return trends;
    }
}
