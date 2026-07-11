using MediatR;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Commands.StartInvestigation;

public record StartInvestigationCommand(
    Guid IncidentId,
    Guid TenantId,
    Guid InvestigatedBy
) : IRequest<Unit>;
