using MediatR;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentSummary;

public record GetIncidentSummaryQuery(
    Guid TenantId
) : IRequest<IncidentSummaryDto>;
