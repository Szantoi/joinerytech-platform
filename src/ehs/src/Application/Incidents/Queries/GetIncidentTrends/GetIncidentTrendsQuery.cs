using MediatR;
using SpaceOS.Modules.Ehs.Application.Incidents.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Incidents.Queries.GetIncidentTrends;

public record GetIncidentTrendsQuery(
    Guid TenantId,
    int MonthsBack = 12
) : IRequest<IncidentTrendsDto>;
