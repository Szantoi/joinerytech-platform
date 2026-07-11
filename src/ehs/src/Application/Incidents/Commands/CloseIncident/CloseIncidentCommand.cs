using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.CloseIncident;

public record CloseIncidentCommand(
    Guid IncidentId,
    Guid TenantId
) : IRequest<Unit>;
