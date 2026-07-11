using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddCorrectiveAction;

public class AddCorrectiveActionCommandHandler : IRequestHandler<AddCorrectiveActionCommand, Unit>
{
    private readonly IIncidentRepository _repository;

    public AddCorrectiveActionCommandHandler(IIncidentRepository repository)
    {
        _repository = repository;
    }

    public async Task<Unit> Handle(AddCorrectiveActionCommand request, CancellationToken ct)
    {
        var incident = await _repository.GetByIdAsync(request.IncidentId, request.TenantId, ct).ConfigureAwait(false);

        if (incident == null)
            throw new InvalidOperationException($"Incident {request.IncidentId} not found");

        incident.AddCorrectiveAction(request.Description, request.AssignedTo, request.DueDate);

        await _repository.UpdateAsync(incident, ct).ConfigureAwait(false);

        return Unit.Value;
    }
}
