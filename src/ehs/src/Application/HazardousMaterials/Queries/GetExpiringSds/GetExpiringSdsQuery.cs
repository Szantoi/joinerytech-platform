using MediatR;
using SpaceOS.Modules.Ehs.Application.HazardousMaterials.DTOs;

namespace SpaceOS.Modules.Ehs.Application.HazardousMaterials.Queries.GetExpiringSds;

/// <summary>
/// Query for active materials whose SDS expires within the window (dashboard).
/// Default window: 30 days (the Expiring threshold).
/// </summary>
public record GetExpiringSdsQuery(
    Guid TenantId,
    int WithinDays = 30
) : IRequest<List<HazardousMaterialListItemDto>>;
