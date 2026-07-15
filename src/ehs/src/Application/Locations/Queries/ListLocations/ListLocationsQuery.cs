using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.Locations.DTOs;

namespace SpaceOS.Modules.Ehs.Application.Locations.Queries.ListLocations;

/// <summary>
/// Query for the flat location list (clients build the tree from ParentLocationId)
/// </summary>
public record ListLocationsQuery(
    Guid TenantId,
    LocationFilter Filter
) : IRequest<List<EhsLocationDto>>;
