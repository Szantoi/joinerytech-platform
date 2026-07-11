using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to remove a maintenance plan from an asset.
/// </summary>
public record RemoveMaintenancePlanCommand(
    AssetId AssetId,
    int PlanIndex,
    Guid TenantId
) : IRequest<Result>;
