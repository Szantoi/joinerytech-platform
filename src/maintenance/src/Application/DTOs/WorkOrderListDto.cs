using SpaceOS.Modules.Maintenance.Domain.Enums;

namespace SpaceOS.Modules.Maintenance.Application.DTOs;

/// <summary>
/// Lightweight work order DTO for list/pagination.
/// </summary>
public record WorkOrderListDto(
    Guid Id,
    Guid AssetId,
    string AssetCode,
    WorkOrderType Type,
    WorkOrderPriority Priority,
    WorkOrderStatus Status,
    string Title,
    DateTime CreatedAt
);
