using Ardalis.Result;
using MediatR;
using SpaceOS.Modules.Maintenance.Domain.Enums;
using SpaceOS.Modules.Maintenance.Domain.StrongIds;

namespace SpaceOS.Modules.Maintenance.Application.Commands;

/// <summary>
/// Command to add a maintenance plan to an asset.
/// </summary>
public record AddMaintenancePlanCommand(
    AssetId AssetId,
    MaintenanceTrigger Trigger,
    int? IntervalDays,
    decimal? OperatingHoursThreshold,
    string? Description,
    Guid TenantId
) : IRequest<Result>;
