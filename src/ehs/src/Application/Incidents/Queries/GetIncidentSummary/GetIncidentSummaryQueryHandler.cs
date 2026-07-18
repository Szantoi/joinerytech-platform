using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;
using SpaceOS.Modules.Ehs.Application.Wire;

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

        // Map IncidentSummary → IncidentSummaryDto — the breakdown dictionary
        // keys are wire keys (ADR-059), not English member names.
        return new IncidentSummaryDto(
            summary.TotalIncidents,
            summary.ByType.ToDictionary(x => EhsWire.IncidentType.ToWire(x.Key), x => x.Value),
            summary.BySeverity.ToDictionary(x => EhsWire.Severity.ToWire(x.Key), x => x.Value),
            summary.ByStatus.ToDictionary(x => EhsWire.IncidentStatus.ToWire(x.Key), x => x.Value)
        );
    }
}
