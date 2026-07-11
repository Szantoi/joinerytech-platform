using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentSummary;

public class GetIncidentSummaryQueryHandler : IRequestHandler<GetIncidentSummaryQuery, IncidentSummaryDto>
{
    private readonly IIncidentRepository _repository;

    public GetIncidentSummaryQueryHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<IncidentSummaryDto> Handle(GetIncidentSummaryQuery request, CancellationToken ct)
    {
        var summary = await _repository.GetSummaryAsync(request.TenantId, ct).ConfigureAwait(false);

        // Map IncidentSummary → IncidentSummaryDto
        return new IncidentSummaryDto(
            summary.TotalIncidents,
            summary.ByType.ToDictionary(x => x.Key.ToString(), x => x.Value),
            summary.BySeverity.ToDictionary(x => x.Key.ToString(), x => x.Value),
            summary.ByStatus.ToDictionary(x => x.Key.ToString(), x => x.Value)
        );
    }
}
