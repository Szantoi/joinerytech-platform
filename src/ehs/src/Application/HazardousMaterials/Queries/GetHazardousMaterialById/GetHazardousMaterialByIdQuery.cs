using MediatR;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetHazardousMaterialById;

/// <summary>
/// Query for a single hazardous material
/// </summary>
public record GetHazardousMaterialByIdQuery(
    Guid MaterialId,
    Guid TenantId
) : IRequest<HazardousMaterialDto>;
