using MediatR;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentById;

public record GetIncidentByIdQuery(
    Guid IncidentId,
    Guid TenantId
) : IRequest<IncidentDto?>;
