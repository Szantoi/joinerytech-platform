using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Domain.Aggregates.IncidentAggregate;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CreateIncident;

/// <summary>
/// Handler for CreateIncidentCommand
/// </summary>
public class CreateIncidentCommandHandler : IRequestHandler<CreateIncidentCommand, Guid>
{
    private readonly IIncidentRepository _repository;

    public CreateIncidentCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Guid> Handle(CreateIncidentCommand request, CancellationToken ct)
    {
        var incident = Incident.Create(
            request.TenantId,
            request.IncidentType,
            request.IncidentDate,
            request.Location,
            request.Description,
            request.Severity,
            request.ReportedBy
        );

        await _repository.AddAsync(incident, ct).ConfigureAwait(false);

        return incident.IncidentId;
    }
}
