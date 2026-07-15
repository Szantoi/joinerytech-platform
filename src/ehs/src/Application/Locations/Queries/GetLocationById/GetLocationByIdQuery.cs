using MediatR;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.GetLocationById;

/// <summary>
/// Query for a single location node
/// </summary>
public record GetLocationByIdQuery(
    Guid LocationId,
    Guid TenantId
) : IRequest<EhsLocationDto>;
