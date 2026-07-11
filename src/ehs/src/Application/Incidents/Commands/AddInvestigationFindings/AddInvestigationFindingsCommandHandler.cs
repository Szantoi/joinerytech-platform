using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddInvestigationFindings;

public class AddInvestigationFindingsCommandHandler : IRequestHandler<AddInvestigationFindingsCommand, Unit>
{
    private readonly IIncidentRepository _repository;

    public AddInvestigationFindingsCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(AddInvestigationFindingsCommand request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        if (incident == null)
            throw new InvalidOperationException($"Incident {request.IncidentId} not found");

        incident.AddInvestigationFindings(request.Findings, request.RootCause, request.Recommendations);

        await _repository.UpdateAsync(incident, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
