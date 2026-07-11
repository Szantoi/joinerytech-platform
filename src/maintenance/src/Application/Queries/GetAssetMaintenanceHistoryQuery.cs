using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Application.DTOs;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Queries;

/// <summary>
/// Query to get the maintenance history (all work orders) for a specific asset.
/// </summary>
public record GetAssetMaintenanceHistoryQuery(
    AssetId AssetId,
    Guid TenantId
) : IRequest<Result<WorkOrderDto[]>>;
