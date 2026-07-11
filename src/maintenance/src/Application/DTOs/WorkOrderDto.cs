using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Full work order DTO with all details.
/// </summary>
public record WorkOrderDto(
    Guid Id,
    Guid AssetId,
    string AssetCode,            // Denormalized for convenience
    WorkOrderType Type,
    WorkOrderPriority Priority,
    WorkOrderStatus Status,
    string Title,
    string Description,
    DateTime? ScheduledStart,
    decimal? EstimatedHours,
    decimal? ActualHours,
    Guid? AssignedTo,
    AssignmentType? AssignmentType,
    bool RequiresDowntime,       // CRITICAL: Production integration
    WorkOrderPartDto[] Parts,
    decimal TotalPartsCost,
    string? CompletionNote,
    DateTime CreatedAt
);
