using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Full work order DTO with all details.
/// Returned by the detail query AND by every transition endpoint
/// (portal UI contract: the fresh aggregate state after a transition).
/// </summary>
public record WorkOrderDto(
    Guid Id,
    Guid AssetId,
    string AssetCode,            // Denormalized for convenience
    string AssetName,            // Denormalized for convenience (portal detail view)
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
    DateTime? StartedAt,
    DateTime? CompletedAt,
    string? PostponementReason,
    string? RejectionReason,
    WorkOrderPartDto[] Parts,
    decimal TotalPartsCost,
    string? CompletionNote,
    DateTime CreatedAt
);
