using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.ListIncidents;

public record ListIncidentsQuery(
    Guid TenantId,
    IncidentFilter Filter
) : IRequest<List<IncidentListItemDto>>;
