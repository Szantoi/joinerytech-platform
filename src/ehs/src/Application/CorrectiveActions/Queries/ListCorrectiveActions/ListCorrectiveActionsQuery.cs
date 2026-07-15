using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.CorrectiveActions.DTOs;

namespace SpaceOS.Modules.Ehs.Application.CorrectiveActions.Queries.ListCorrectiveActions;

/// <summary>
/// Query for the UNIFIED CAPA board — corrective actions from every source
/// (incident, safety walk, risk assessment) in one list.
/// </summary>
public record ListCorrectiveActionsQuery(
    Guid TenantId,
    CapaFilter Filter
) : IRequest<List<CapaDto>>;
