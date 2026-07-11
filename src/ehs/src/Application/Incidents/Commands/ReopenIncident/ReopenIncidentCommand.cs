using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.ReopenIncident;

public record ReopenIncidentCommand(
    Guid IncidentId,
    Guid TenantId
) : IRequest<Unit>;
