using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CloseIncident;

public class CloseIncidentCommandHandler : IRequestHandler<CloseIncidentCommand, Unit>
{
    private readonly IIncidentRepository _repository;

    public CloseIncidentCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(CloseIncidentCommand request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        if (incident == null)
            throw new InvalidOperationException($"Incident {request.IncidentId} not found");

        incident.CloseIncident();

        await _repository.UpdateAsync(incident, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
