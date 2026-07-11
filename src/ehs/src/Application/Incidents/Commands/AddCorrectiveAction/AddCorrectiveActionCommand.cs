using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.AddCorrectiveAction;

public record AddCorrectiveActionCommand(
    Guid IncidentId,
    Guid TenantId,
    string Description,
    Guid AssignedTo,
    DateTimeOffset DueDate
) : IRequest<Unit>;
