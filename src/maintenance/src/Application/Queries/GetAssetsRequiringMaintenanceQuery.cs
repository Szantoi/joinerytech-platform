using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get assets that require maintenance based on their maintenance plans.
/// </summary>
public record GetAssetsRequiringMaintenanceQuery(
    Guid TenantId
) : IRequest<Result<AssetDto[]>>;
