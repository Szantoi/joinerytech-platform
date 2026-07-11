using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.StartInvestigation;

public class StartInvestigationCommandHandler : IRequestHandler<StartInvestigationCommand, Unit>
{
    private readonly IIncidentRepository _repository;

    public StartInvestigationCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(StartInvestigationCommand request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        if (incident == null)
            throw new InvalidOperationException($"Incident {request.IncidentId} not found");

        incident.StartInvestigation(request.InvestigatedBy);

        await _repository.UpdateAsync(incident, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
