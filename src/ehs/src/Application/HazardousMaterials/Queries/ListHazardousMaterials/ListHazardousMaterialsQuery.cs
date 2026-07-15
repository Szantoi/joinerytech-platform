using MediatR;
using SpaceOS.Modules.Ehs.Application.Contracts;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.ListHazardousMaterials;

/// <summary>
/// Query for the hazardous material list (filter: status, location, SDS validity)
/// </summary>
public record ListHazardousMaterialsQuery(
    Guid TenantId,
    MaterialFilter Filter
) : IRequest<List<HazardousMaterialListItemDto>>;
