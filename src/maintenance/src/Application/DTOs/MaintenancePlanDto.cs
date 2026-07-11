using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Maintenance plan DTO (nested in AssetDto).
/// </summary>
public record MaintenancePlanDto(
    MaintenanceTrigger Trigger,
    int? IntervalDays,
    decimal? OperatingHoursThreshold,
    string? Description
);
