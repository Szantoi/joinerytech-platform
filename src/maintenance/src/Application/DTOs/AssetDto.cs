using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Full asset DTO with all details.
/// </summary>
public record AssetDto(
    Guid Id,
    AssetKind Kind,
    string Code,
    string Name,
    string Location,
    AssetStatus Status,           // COMPUTED from WorkOrders!
    decimal? OperatingHours,      // Only for Machine/Vehicle
    bool Retired,
    MaintenancePlanDto[] MaintenancePlans,
    DateTime CreatedAt
);
