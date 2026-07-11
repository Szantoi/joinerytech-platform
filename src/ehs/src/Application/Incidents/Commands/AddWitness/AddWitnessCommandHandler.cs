using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddWitness;

public class AddWitnessCommandHandler : IRequestHandler<AddWitnessCommand, Unit>
{
    private readonly IIncidentRepository _repository;

    public AddWitnessCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(AddWitnessCommand request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        if (incident == null)
            throw new InvalidOperationException($"Incident {request.IncidentId} not found");

        incident.AddWitness(request.EmployeeId, request.Statement);

        await _repository.UpdateAsync(incident, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
